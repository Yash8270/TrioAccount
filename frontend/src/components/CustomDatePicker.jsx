import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function CustomDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Use UTC or local parsing carefully to ensure the day doesn't shift
  // value is expected to be "YYYY-MM-DD"
  const getInitialDate = () => {
    if (!value) return new Date();
    const [y, m, d] = value.split('-');
    return new Date(y, parseInt(m) - 1, d);
  };

  const [currentDate, setCurrentDate] = useState(getInitialDate());
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      setCurrentDate(new Date(y, parseInt(m) - 1, d));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDateSelect = (day) => {
    // Format to YYYY-MM-DD in local time equivalent
    const selectedYear = year;
    const selectedMonth = String(month + 1).padStart(2, '0');
    const selectedDay = String(day).padStart(2, '0');
    onChange(`${selectedYear}-${selectedMonth}-${selectedDay}`);
    setIsOpen(false);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Grid cells
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-field"
        style={{ 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          cursor: 'pointer',
          textAlign: 'left',
          borderColor: isOpen ? 'var(--primary-color)' : 'var(--border-color)',
          boxShadow: isOpen ? '0 0 0 4px rgba(62, 105, 83, 0.15)' : 'none'
        }}
      >
        <span style={{ fontWeight: '500' }}>
          {value ? new Date(getInitialDate()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Date'}
        </span>
        <CalendarIcon size={18} color="var(--primary-color)" />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 0.5rem)',
          left: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          border: '1px solid var(--border-color)',
          padding: '1.25rem',
          zIndex: 100,
          width: '280px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-secondary)' }}>
              <ChevronLeft size={20} />
            </button>
            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {monthNames[month]} {year}
            </div>
            <button 
              type="button" 
              onClick={nextMonth} 
              disabled={year > new Date().getFullYear() || (year === new Date().getFullYear() && month >= new Date().getMonth())}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: (year > new Date().getFullYear() || (year === new Date().getFullYear() && month >= new Date().getMonth())) ? 'not-allowed' : 'pointer', 
                padding: '0.25rem', 
                color: 'var(--text-secondary)',
                opacity: (year > new Date().getFullYear() || (year === new Date().getFullYear() && month >= new Date().getMonth())) ? 0.3 : 1
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day Names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '0.5rem', textAlign: 'center' }}>
            {dayNames.map(day => (
              <div key={day} style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{day}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {totalSlots.map((day, idx) => {
              if (!day) return <div key={idx} />;
              
              const valDate = getInitialDate();
              const isSelected = value && valDate.getDate() === day && valDate.getMonth() === month && valDate.getFullYear() === year;
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              
              const cellDate = new Date(year, month, day);
              const todayDate = new Date();
              todayDate.setHours(0, 0, 0, 0);
              const isFuture = cellDate > todayDate;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!isFuture) handleDateSelect(day);
                  }}
                  disabled={isFuture}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? 'var(--primary-color)' : isToday ? '#EAF0EC' : 'transparent',
                    color: isSelected ? '#FFFFFF' : isToday ? 'var(--primary-color)' : 'var(--text-primary)',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: isFuture ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: isSelected || isToday ? 'bold' : 'normal',
                    margin: 'auto',
                    opacity: isFuture ? 0.3 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isFuture) e.target.style.background = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isFuture) e.target.style.background = isToday ? '#EAF0EC' : 'transparent';
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
