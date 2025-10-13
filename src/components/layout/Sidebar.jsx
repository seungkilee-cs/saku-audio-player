import React from "react";
import "../../styles/Sidebar.css";

const Sidebar = ({
  position = "left",
  isOpen = true,
  onToggle,
  title,
  children,
}) => {
  return (
    <aside
      className={`sidebar sidebar--${position} ${isOpen ? "sidebar--open" : "sidebar--collapsed"}`}
      aria-label={title}
    >
      {isOpen && (
        <div className="sidebar__header">
          <h2 className="sidebar__title">{title}</h2>
          <button
            className="sidebar__toggle"
            onClick={onToggle}
            aria-label={`Collapse ${title}`}
            title={`Collapse ${title}`}
          >
            {position === "left" ? "◀" : "▶"}
          </button>
        </div>
      )}

      {!isOpen && (
        <button
          className="sidebar__toggle sidebar__toggle--collapsed"
          onClick={onToggle}
          aria-label={`Expand ${title}`}
          title={`Expand ${title}`}
        >
          {position === "left" ? "▶" : "◀"}
        </button>
      )}

      <div className="sidebar__content">{children}</div>
    </aside>
  );
};

export default Sidebar;
