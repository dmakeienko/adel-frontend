import { useState, useEffect, useRef } from 'react';
import type { User, Group, UserGroupStatus } from '../types';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import './GroupMembership.css';

interface GroupMembershipProps {
  user: User;
  onUpdate?: () => void;
}

export function GroupMembership({ user, onUpdate }: GroupMembershipProps) {
  const [groups, setGroups] = useState<UserGroupStatus[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, 'add' | 'remove'>
  >(new Map());
  const { showNotification } = useNotification();
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadUserGroups();
    loadAllGroups();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAllGroups = async () => {
    try {
      const response = await api.getAllGroups();
      if (response.success && response.groups) {
        setAllGroups(response.groups);
      }
    } catch {
      console.error('Failed to load groups');
    }
  };

  const loadUserGroups = () => {
    if (!user.memberOf) {
      setGroups([]);
      return;
    }

    const userGroups: UserGroupStatus[] = user.memberOf.map((groupDN) => {
      const groupName = extractCNFromDN(groupDN);
      const foundGroup = allGroups.find(
        (g) => g.cn === groupName || g.distinguishedName === groupDN
      );

      return {
        group: foundGroup || {
          dn: groupDN,
          cn: groupName,
          sAMAccountName: groupName,
          description: '',
        },
        isMember: true,
        membershipType: 'direct',
      };
    });

    setGroups(userGroups.sort((a, b) => a.group.cn.localeCompare(b.group.cn)));
  };

  useEffect(() => {
    if (allGroups.length > 0) {
      loadUserGroups();
    }
  }, [allGroups, user.memberOf]);

  const extractCNFromDN = (dn: string): string => {
    const match = dn.match(/^CN=([^,]+)/i);
    return match ? match[1] : dn;
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.searchGroups(searchQuery);
        if (response.success && response.groups) {
          const existingDNs = new Set(groups.map((g) => g.group.dn));
          const filtered = response.groups.filter(
            (g) => !existingDNs.has(g.dn)
          );
          setSearchResults(filtered);
          setIsSearchOpen(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, groups]);

  const addGroupToTable = (group: Group) => {
    const newGroupStatus: UserGroupStatus = {
      group,
      isMember: true,
      membershipType: 'direct',
    };

    setGroups((prev) =>
      [...prev, newGroupStatus].sort((a, b) =>
        a.group.cn.localeCompare(b.group.cn)
      )
    );

    setPendingChanges((prev) => {
      const newChanges = new Map(prev);
      newChanges.set(group.cn, 'add');
      return newChanges;
    });

    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  const toggleMembership = (groupCN: string, currentStatus: boolean) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.group.cn === groupCN ? { ...g, isMember: !currentStatus } : g
      )
    );

    setPendingChanges((prev) => {
      const newChanges = new Map(prev);
      const originalMember = user.memberOf?.some((dn) =>
        dn.toLowerCase().includes(`cn=${groupCN.toLowerCase()}`)
      );

      if (originalMember) {
        if (currentStatus) {
          newChanges.set(groupCN, 'remove');
        } else {
          newChanges.delete(groupCN);
        }
      } else {
        if (!currentStatus) {
          newChanges.set(groupCN, 'add');
        } else {
          newChanges.delete(groupCN);
        }
      }
      return newChanges;
    });
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) {
      showNotification('No changes to save', 'info');
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const [groupName, action] of pendingChanges) {
      const response = action === 'add'
        ? await api.addUserToGroup(user.sAMAccountName, groupName)
        : await api.removeUserFromGroup(user.sAMAccountName, groupName);

      if (response.success) {
        successCount++;
      } else {
        const errorMsg = response.error || 'Unknown error';
        errors.push(`${groupName}: ${errorMsg}`);
      }
    }

    setIsSaving(false);
    setPendingChanges(new Map());

    if (errors.length === 0) {
      showNotification(
        `Successfully updated ${successCount} group membership(s)`,
        'success'
      );
    } else if (successCount > 0) {
      showNotification(
        `Updated ${successCount} membership(s). Errors: ${errors.join('; ')}`,
        'warning',
        15000
      );
    } else {
      showNotification(
        `Failed to update memberships: ${errors.join('; ')}`,
        'error',
        15000
      );
    }

    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <div className="group-membership">
      <h2>Group Membership</h2>

      <div className="group-search" ref={searchRef}>
        <div className="group-search-wrapper">
          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search groups to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setIsSearchOpen(true)}
          />
          {isSearching && <span className="search-spinner" />}
        </div>

        {isSearchOpen && searchResults.length > 0 && (
          <div className="group-search-results">
            {searchResults.map((group) => (
              <button
                key={group.dn}
                className="group-search-item"
                onClick={() => addGroupToTable(group)}
              >
                <span className="group-name">{group.cn}</span>
                <span className="group-description">
                  {group.description || 'No description'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="groups-table-container">
        <table className="groups-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Group Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={4} className="no-groups">
                  No group memberships found
                </td>
              </tr>
            ) : (
              groups.map((groupStatus) => (
                <tr
                  key={groupStatus.group.dn}
                  className={
                    pendingChanges.has(groupStatus.group.cn)
                      ? 'pending-change'
                      : ''
                  }
                >
                  <td className="group-name-cell">{groupStatus.group.cn}</td>
                  <td className="group-description-cell">
                    {groupStatus.group.description || '-'}
                  </td>
                  <td className="group-type-cell">
                    <span
                      className={`type-badge ${groupStatus.membershipType}`}
                    >
                      {groupStatus.membershipType}
                    </span>
                  </td>
                  <td className="group-status-cell">
                    <label className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={groupStatus.isMember}
                        onChange={() =>
                          toggleMembership(
                            groupStatus.group.cn,
                            groupStatus.isMember
                          )
                        }
                      />
                      <span className="checkmark" />
                    </label>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="group-actions">
        {pendingChanges.size > 0 && (
          <span className="pending-count">
            {pendingChanges.size} pending change(s)
          </span>
        )}
        <button
          className="save-button"
          onClick={handleSave}
          disabled={isSaving || pendingChanges.size === 0}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
