import { useState, useRef, useEffect, useCallback } from 'react';
import { TimePicker } from './TimePicker';
import { DatePicker } from './DatePicker';

export function InputBar({
  sourceId,
  cities,
  hour,
  minute,
  date,
  use24Hour,
  onSetSource,
  onUpdateTime,
  onSetNow,
  onToggleFormat,
}) {
  const [timeInput, setTimeInput] = useState('');
  const [isFreshTime, setIsFreshTime] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPulse, setIsPulse] = useState(true);
  const inputRef = useRef(null);
  const timePickerBtnRef = useRef(null);
  const timePillRef = useRef(null);
  const dateTriggerRef = useRef(null);

  useEffect(() => {
    const syncToSecond = () => {
      const now = new Date();
      const msUntilNextSecond = 1000 - now.getMilliseconds();
      
      const timeout = setTimeout(() => {
        setIsPulse(true);
        setTimeout(() => setIsPulse(false), 500);
        
        const interval = setInterval(() => {
          setIsPulse(true);
          setTimeout(() => setIsPulse(false), 500);
        }, 1000);
        
        timeoutRef.current = interval;
      }, msUntilNextSecond);
      
      return timeout;
    };

    const timeoutRef = { current: null };
    const initialTimeout = syncToSecond();

    return () => {
      clearTimeout(initialTimeout);
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, []);

  const sourceCity = cities.find(c => c.id === sourceId);

  let displayHour = hour;
  let period = hour >= 12 ? 'PM' : 'AM';
  if (!use24Hour) {
    displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  }
  const timeStr = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const displayTime = isFreshTime ? timeInput : timeStr;

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const handleTimeFocus = useCallback((e) => {
    e.target.select();
    setIsFreshTime(false);
    setTimeInput('');
  }, []);

  const handleTimeInput = useCallback((e) => {
    let value = e.target.value.replace(/[^\d:]/g, '');
    
    if (value.length > 5) {
      value = value.slice(0, 5);
    }
    
    setTimeInput(value);
    setIsFreshTime(true);

    const parseAndUpdateTime = (hStr, mStr) => {
      let h = parseInt(hStr, 10);
      let m = parseInt(mStr, 10);
      
      if (isNaN(h) || isNaN(m) || m > 59 || m < 0) return;
      
      if (use24Hour) {
        h = Math.min(23, Math.max(0, h));
      } else {
        h = Math.min(12, Math.max(1, h));
        if (period === 'PM' && h !== 12) h += 12;
        else if (period === 'AM' && h === 12) h = 0;
      }
      
      onUpdateTime({ hour: h, minute: m });
      setIsFreshTime(false);
    };

    if (value.includes(':')) {
      const [hStr, mStr] = value.split(':');
      if (mStr && mStr.length === 2) {
        parseAndUpdateTime(hStr, mStr);
      }
    } else {
      if (value.length === 4) {
        const hStr = value.slice(0, 2);
        const mStr = value.slice(2, 4);
        parseAndUpdateTime(hStr, mStr);
      } else if (value.length === 3) {
        const hStr = value.slice(0, 1);
        const mStr = value.slice(1, 3);
        parseAndUpdateTime(hStr, mStr);
      }
    }
  }, [use24Hour, period, onUpdateTime]);

  const handleTimeBlur = useCallback(() => {
    setIsFreshTime(false);
    setTimeInput('');
  }, []);

  const handlePeriodToggle = useCallback(() => {
    let newHour = hour;
    if (hour < 12) newHour = hour + 12;
    else newHour = hour - 12;
    onUpdateTime({ hour: newHour });
  }, [hour, onUpdateTime]);

  return (
    <div className="input-bar">
      
      <div className="input-bar__item input-bar__item--source">
        <span className="input-bar__static-label">From</span>
        <div className="input-bar__group">
          <select 
            className="input-bar__select"
            value={sourceId}
            onChange={(e) => onSetSource(e.target.value)}
          >
            {cities.map(city => (
              <option key={city.id} value={city.id}>
                {city.flag} {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="input-bar__item input-bar__item--date">
        <span className="input-bar__static-label">On Date</span>
        <button 
          ref={dateTriggerRef}
          className="input-bar__date-pill"
          onClick={() => setShowDatePicker(true)}
          aria-label="Open date picker"
        >
          <div className="input-bar__date-icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <span className="input-bar__date-text">{formatDateDisplay(date)}</span>
        </button>
      </div>

      <div className="input-bar__item input-bar__item--time">
        <span className="input-bar__static-label">At</span>
        <div className="input-bar__row">
          <div ref={timePillRef} className="input-bar__time-pill">
            <button
              ref={timePickerBtnRef}
              className="input-bar__clock-btn"
              onClick={() => setShowTimePicker(true)}
              aria-label="Open time picker"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              className="input-bar__time-input"
              value={displayTime}
              onChange={handleTimeInput}
              onFocus={handleTimeFocus}
              onBlur={handleTimeBlur}
              placeholder="HH:MM"
            />
            <button 
              className={`input-bar__period-toggle ${use24Hour ? 'input-bar__period-toggle--hidden' : ''}`}
              onClick={handlePeriodToggle}
              aria-hidden={use24Hour}
              tabIndex={use24Hour ? -1 : 0}
            >
              {period}
            </button>
          </div>

          <div className="input-bar__format-toggle">
            <button
              className={`input-bar__format-btn ${!use24Hour ? 'input-bar__format-btn--active' : ''}`}
              onClick={() => use24Hour && onToggleFormat()}
            >
              12h
            </button>
            <button
              className={`input-bar__format-btn ${use24Hour ? 'input-bar__format-btn--active' : ''}`}
              onClick={() => !use24Hour && onToggleFormat()}
            >
              24h
            </button>
          </div>
        </div>
      </div>

      <div className="input-bar__item input-bar__item--now">
        <span className="input-bar__static-label">(or)</span>
        <button className="input-bar__now-btn" onClick={onSetNow}>
          <span className={`input-bar__now-indicator ${isPulse ? 'input-bar__now-indicator--pulse' : ''}`} />
          Now
        </button>
      </div>

      <TimePicker
        isOpen={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        hour={hour}
        minute={minute}
        use24Hour={use24Hour}
        onTimeSelect={onUpdateTime}
        triggerRef={timePillRef}
      />
      
      <DatePicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        dateStr={date}
        onDateSelect={(d) => onUpdateTime({ date: d })}
        triggerRef={dateTriggerRef}
      />
    </div>
  );
}
