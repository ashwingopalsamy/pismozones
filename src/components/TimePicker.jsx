import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export function Wheel({ items, value, onChange, label }) {
  const containerRef = useRef(null);
  const itemHeight = 36;
  const visibleItems = 5;
  const centerOffset = Math.floor(visibleItems / 2);
  
  const currentIndex = items.indexOf(value);
  const [scrollOffset, setScrollOffset] = useState(-currentIndex * itemHeight);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ y: 0, offset: 0, moved: false });
  
  useEffect(() => {
    if (!isDragging) {
      setScrollOffset(-currentIndex * itemHeight);
    }
  }, [currentIndex, itemHeight, isDragging]);
  
  const snapToIndex = useCallback((targetIndex) => {
    const clampedIndex = Math.max(0, Math.min(items.length - 1, targetIndex));
    setScrollOffset(-clampedIndex * itemHeight);
    if (items[clampedIndex] !== value) {
      onChange(items[clampedIndex]);
    }
  }, [items, itemHeight, value, onChange]);
  
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    
    setIsDragging(true);
    dragStartRef.current = { 
      y: e.clientY, 
      offset: scrollOffset, 
      moved: false 
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleMouseMove = useCallback((e) => {
    const delta = e.clientY - dragStartRef.current.y;
    
    if (Math.abs(delta) > 5) {
      dragStartRef.current.moved = true;
    }
    
    if (dragStartRef.current.moved) {
      setScrollOffset(dragStartRef.current.offset + delta);
    }
  }, []);

  
  const handleMouseUp = useCallback((e) => {
    setIsDragging(false);
    
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    
    if (dragStartRef.current.moved) {
      const currentOffset = dragStartRef.current.offset + (e.clientY - dragStartRef.current.y);
      const nearestIndex = Math.round(-currentOffset / itemHeight);
      snapToIndex(nearestIndex);
    }
    
    dragStartRef.current.moved = false;
  }, [handleMouseMove, itemHeight, snapToIndex]);
  
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    snapToIndex(currentIndex + delta);
  };
  
  const handleItemClick = (index) => {
    if (dragStartRef.current.moved) return;
    snapToIndex(index);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      snapToIndex(currentIndex - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      snapToIndex(currentIndex + 1);
    }
  };
  
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  return (
    <div 
      ref={containerRef}
      className="time-picker-wheel"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label={label}
      style={{ height: itemHeight * visibleItems }}
    >
      <div 
        className="time-picker-wheel__indicator"
        style={{ top: centerOffset * itemHeight, height: itemHeight }}
      />
      <div className="time-picker-wheel__fade time-picker-wheel__fade--top" />
      <div className="time-picker-wheel__fade time-picker-wheel__fade--bottom" />
      
      <div 
        className="time-picker-wheel__items"
        style={{ 
          transform: `translateY(${scrollOffset + centerOffset * itemHeight}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        {items.map((item, index) => (
          <div
            key={item}
            className={`time-picker-wheel__item ${item === value ? 'time-picker-wheel__item--selected' : ''}`}
            style={{ height: itemHeight }}
            onClick={() => handleItemClick(index)}
          >
            {typeof item === 'string' ? item : String(item).padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimePicker({ 
  isOpen, 
  onClose, 
  hour, 
  minute, 
  use24Hour, 
  onTimeSelect,
  triggerRef,
}) {
  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedMinute, setSelectedMinute] = useState(minute);
  const [selectedPeriod, setSelectedPeriod] = useState(hour >= 12 ? 'PM' : 'AM');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  const modalRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const pickerWidth = 280;
      const pickerHeight = 280;
      
      let left = rect.left + rect.width / 2 - pickerWidth / 2;
      let top = rect.bottom + 8;
      
      if (left < 16) left = 16;
      if (left + pickerWidth > window.innerWidth - 16) {
        left = window.innerWidth - pickerWidth - 16;
      }
      if (top + pickerHeight > window.innerHeight - 16) {
        top = rect.top - pickerHeight - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, triggerRef]);
  
  useEffect(() => {
    if (isOpen) {
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod(hour >= 12 ? 'PM' : 'AM');
    }
  }, [isOpen, hour, minute]);
  
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedHour, selectedMinute]);
  
  const hourItems = use24Hour 
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  
  const minuteItems = Array.from({ length: 60 }, (_, i) => i);
  
  const displayHour = use24Hour 
    ? selectedHour
    : (selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour);
  
  const handleHourChange = (newHour) => {
    if (use24Hour) {
      setSelectedHour(newHour);
    } else {
      let hour24 = newHour;
      if (selectedPeriod === 'PM' && newHour !== 12) hour24 = newHour + 12;
      else if (selectedPeriod === 'AM' && newHour === 12) hour24 = 0;
      setSelectedHour(hour24);
    }
  };
  
  const setPeriod = (period) => {
    if (period === selectedPeriod) return;
    setSelectedPeriod(period);
    
    if (period === 'PM' && selectedHour < 12) {
      setSelectedHour(selectedHour + 12);
    } else if (period === 'AM' && selectedHour >= 12) {
      setSelectedHour(selectedHour - 12);
    }
  };
  
  const handleConfirm = () => {
    onTimeSelect({ hour: selectedHour, minute: selectedMinute });
    onClose();
  };
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="time-picker-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            className="time-picker-dropdown"
            style={{ top: position.top, left: position.left }}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Select time"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="time-picker-wheels">
              <Wheel
                items={hourItems}
                value={displayHour}
                onChange={handleHourChange}
                label="Hours"
              />
              
              <span className="time-picker-separator">:</span>
              
              <Wheel
                items={minuteItems}
                value={selectedMinute}
                onChange={setSelectedMinute}
                label="Minutes"
              />
              
              {!use24Hour && (
                <div className="time-picker-period">
                  <span 
                    className={selectedPeriod === 'AM' ? 'active' : ''}
                    onClick={() => setPeriod('AM')}
                  >
                    AM
                  </span>
                  <span 
                    className={selectedPeriod === 'PM' ? 'active' : ''}
                    onClick={() => setPeriod('PM')}
                  >
                    PM
                  </span>
                </div>
              )}
            </div>
            
            <div className="time-picker-actions">
              <button 
                className="time-picker-btn time-picker-btn--cancel"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button 
                className="time-picker-btn time-picker-btn--confirm"
                onClick={handleConfirm}
                type="button"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  
  return createPortal(content, document.body);
}
