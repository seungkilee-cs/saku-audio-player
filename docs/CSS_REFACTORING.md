# PEQ Panel CSS Refactoring Documentation

## Date: Oct 21, 2025

## Problems Identified

### 1. **Conflicting Theme Mechanisms**
The CSS uses THREE different theming approaches simultaneously:
- **Base styles**: Hard-coded dark theme values (e.g., `background: rgba(0, 0, 0, 0.2)`)
- **Media queries**: `@media (prefers-color-scheme: light)` for light theme
- **Data attributes**: `[data-theme="flux-night"]` for dark theme

**Why this is broken:**
- The app controls themes via `data-theme` attribute (from `useTheme.js`)
- Media queries respond to OS/browser settings independently
- When OS is in light mode but app theme is dark (or vice versa), styles conflict
- Changes to dark theme affect light theme because they share base styles

### 2. **Non-Modular Architecture**
- No separation between base structure and theme colors
- Direct color values in component styles instead of CSS variables
- Duplicate style declarations across theme blocks
- Difficult to maintain consistency

### 3. **Lack of CSS Custom Properties**
- Hard-coded colors throughout (e.g., `rgba(0, 0, 0, 0.2)`, `#f8fafc`)
- Theme changes require editing multiple locations
- No semantic naming (what is `rgba(15, 23, 42, 0.45)`?)

## Solution: Modular Theme Architecture

### Approach
1. **Base Styles**: Structure, layout, typography (theme-agnostic)
2. **CSS Custom Properties**: Theme-specific colors as variables
3. **Theme Selectors**: Clean separation via `[data-theme="light"]` and `[data-theme="flux-night"]`
4. **No Media Queries**: Remove OS-level theme detection for app-controlled themes

### Benefits
- ✅ Complete theme isolation
- ✅ Single source of truth per theme
- ✅ Easy to add new themes
- ✅ Maintainable and readable
- ✅ No cross-contamination between themes

## Refactoring Plan

### Step 1: Define Theme Variables
Create CSS custom properties for each theme at component level:
```css
.peq-panel {
  /* Light theme (default) */
  --peq-surface-primary: rgba(255, 255, 255, 0.98);
  --peq-surface-secondary: rgba(255, 255, 255, 0.94);
  --peq-border: rgba(142, 152, 168, 0.18);
  --peq-text-primary: #1a1d24;
  /* ... */
}

[data-theme="flux-night"] .peq-panel {
  /* Dark theme overrides */
  --peq-surface-primary: rgba(0, 0, 0, 0.2);
  --peq-surface-secondary: rgba(15, 23, 42, 0.45);
  --peq-border: rgba(255, 255, 255, 0.05);
  --peq-text-primary: #f8fafc;
  /* ... */
}
```

### Step 2: Refactor Component Styles
Replace hard-coded values with variables:
```css
/* Before */
.peq-panel__global-controls {
  background: rgba(0, 0, 0, 0.2);
  color: #f8fafc;
}

/* After */
.peq-panel__global-controls {
  background: var(--peq-surface-primary);
  color: var(--peq-text-primary);
}
```

### Step 3: Remove Media Queries
Delete all `@media (prefers-color-scheme: light)` blocks

### Step 4: Test Both Themes
Verify no cross-contamination by toggling themes in app

## File Structure (Proposed)
```
PeqPanel.css
├── [1] CSS Custom Properties (Theme Variables)
├── [2] Base Component Styles (theme-agnostic)
├── [3] Dark Theme Overrides ([data-theme="flux-night"])
└── [4] Responsive Media Queries (@media screen)
```

## Implementation Notes
- Keep base styles theme-neutral (structure only)
- Use semantic variable names (e.g., `--peq-surface-primary` not `--peq-dark-bg`)
- Light theme should be the default (most common)
- Dark theme uses `[data-theme="flux-night"]` selector
- All colors/shadows/borders should use variables
