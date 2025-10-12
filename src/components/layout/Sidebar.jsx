import React from 'react';
import '../../styles/Sidebar.css';

const Sidebar = ({ 
  position = 'left', 
  isOpen = true, 
  onToggle, 
  title,
  children 
}) => {
  return (
    <aside 
      className={`sidebar sidebar--${position} ${isOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}
      aria-label={title}
    >
      <div className="sidebar__header">
        {isOpen && title && (
          <h2 className="sidebar__title">{title}</h2>
        )}
        <button 
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
          title={isOpen ? `Collapse ${title}` : `Expand ${title}`}
        >
          {isOpen ? (
            position === 'left' ? '◀' : '▶'
          ) : (
            position === 'left' ? '▶' : '◀'
          )}
        </button>
      </div>
      
      <div className="sidebar__content">
        {children}
      </div>
    </aside>
  );
};

export default Sidebar;
