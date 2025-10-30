export function handlePlaylistItemKeyDown({ event, index, onSelect, onRemove }) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect?.(index);
    return;
  }

  if ((event.key === "Delete" || event.key === "Backspace") && typeof onRemove === "function") {
    event.preventDefault();
    event.stopPropagation();
    onRemove(index);
  }
}
