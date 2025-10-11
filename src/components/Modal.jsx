import React, { useEffect, useRef } from 'react';
import '../styles/Modal.css';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  theme = 'light', // 'light' or 'dark'
  closeOnBackdrop = true,
  closeOnEscape = true 
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement;
      
      // Focus the modal
      modalRef.current?.focus();
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus to previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  const handleBackdropClick = (event) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div 
        ref={modalRef}
        className={`modal modal--${size} modal--${theme}`}
        tabIndex={-1}
      >
        <div className="modal__header">
          {title && (
            <h2 id="modal-title" className="modal__title">
              {title}
            </h2>
          )}
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="modal__content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;