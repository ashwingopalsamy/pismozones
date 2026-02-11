import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Wheel } from './TimePicker';
import '../styles/tokens.css';
import '../styles/components.css';

export function DatePicker({
  isOpen, 
  onClose, 
  dateStr, 
  onDateSelect,
  triggerRef,
}) {
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  const modalRef = useRef(null);
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  useEffect(() => {
    if (isOpen) {
      let d = new Date();
      if (dateStr) {
        const parts = dateStr.split('-').map(Number);
        if (parts.length === 3 && !parts.some(Number.isNaN)) {
          d.setFullYear(parts[0], parts[1] - 1, parts[2]);
        }
      }
      
      setSelectedYear(d.getFullYear());
      setSelectedMonth(d.getMonth());
      setSelectedDay(d.getDate());
    }
  }, [isOpen, dateStr]);

  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const pickerWidth = 320;
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
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const maxDays = getDaysInMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  useEffect(() => {
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  }, [selectedMonth, selectedYear, maxDays, selectedDay]);

  const handleConfirm = useCallback(() => {
    const y = selectedYear;
    const m = String(selectedMonth + 1).padStart(2, '0');
    const d = String(selectedDay).padStart(2, '0');
    onDateSelect(`${y}-${m}-${d}`);
    onClose();
  }, [selectedYear, selectedMonth, selectedDay, onDateSelect, onClose]);

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
  }, [isOpen, onClose, handleConfirm]);
  
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
            style={{ 
              top: position.top, 
              left: position.left, 
              width: 320
            }}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Select date"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="date-picker-wheels">
              <Wheel
                items={months}
                value={months[selectedMonth]}
                onChange={(val) => setSelectedMonth(months.indexOf(val))}
                label="Month"
              />
              
              <Wheel
                items={days}
                value={selectedDay}
                onChange={setSelectedDay}
                label="Day"
              />
              
              <Wheel
                items={years}
                value={selectedYear}
                onChange={setSelectedYear}
                label="Year"
              />
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
