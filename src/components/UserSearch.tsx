import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { SearchEntry } from '../types';
import './UserSearch.css';

export function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await api.searchUsers(query);
        if (response.success && response.entries) {
          setResults(response.entries);
          setIsOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSelect = (entry: SearchEntry) => {
    const username =
      entry.attributes.sAMAccountName?.[0] ||
      entry.attributes.cn?.[0] ||
      entry.dn;
    navigate(`/user/${username}`);
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  return (
    <div className="user-search" ref={wrapperRef}>
      <div className="search-input-wrapper">
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
          className="search-input"
          placeholder="Search users by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
        {isLoading && <span className="search-spinner" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="search-results">
          {results.map((entry, index) => (
            <button
              key={index}
              className="search-result-item"
              onClick={() => handleSelect(entry)}
            >
              <div className="result-avatar">
                {entry.attributes.givenName?.[0]?.charAt(0) || ''}
                {entry.attributes.sn?.[0]?.charAt(0) || ''}
              </div>
              <div className="result-info">
                <span className="result-name">
                  {entry.attributes.displayName?.[0] ||
                    entry.attributes.cn?.[0] ||
                    'Unknown'}
                </span>
                <span className="result-email">
                  {entry.attributes.mail?.[0] || 'No email'}
                </span>
              </div>
              <span className="result-username">
                {entry.attributes.sAMAccountName?.[0]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
