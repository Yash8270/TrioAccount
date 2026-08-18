import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ options, value, onChange, placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', minWidth: '160px' }}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="filter-select"
        style={{ 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          backgroundImage: 'none',
          padding: '0.5rem 1rem',
          boxShadow: isOpen ? '0 0 0 3px rgba(62, 105, 83, 0.15)' : 'var(--shadow-sm)',
          borderColor: isOpen ? 'var(--primary-color)' : 'var(--border-color)'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} color="var(--primary-color)" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: 'calc(100% + 0.5rem)', 
          left: 0, 
          width: '100%', 
          backgroundColor: '#FFFFFF', 
          borderRadius: '12px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
          border: '1px solid var(--border-color)',
          zIndex: 100,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '250px',
          overflowY: 'auto'
        }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                background: value === opt.value ? 'rgba(62, 105, 83, 0.1)' : 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: value === opt.value ? 'var(--primary-color)' : 'var(--text-primary)',
                fontWeight: value === opt.value ? '600' : '400',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) e.target.style.background = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) e.target.style.background = 'transparent';
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
