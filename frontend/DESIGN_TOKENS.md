# Design Tokens

Mission Control uses a comprehensive design token system for consistent styling across all components.

## Token Categories

### Colors

**Neutral Colors** (grayscale palette):
- `--color-neutral-0` to `--color-neutral-900` - Grayscale values from white to black

**Primary Colors**:
- `--color-primary-50` - Light blue background
- `--color-primary-100` - Very light blue
- `--color-primary-500` - Main blue (#2196f3)
- `--color-primary-600` - Darker blue

**Status Colors**:
- `--color-status-success` - Green (#4caf50)
- `--color-status-warning` - Orange (#ff9800)
- `--color-status-error` - Red (#f44336)
- `--color-status-info` - Blue (#2196f3)

**Agent Level Colors**:
- `--color-level-lead-*` - Blue tones for Lead agents
- `--color-level-specialist-*` - Purple tones for Specialists
- `--color-level-intern-*` - Orange tones for Interns

### Typography

**Font Family**:
- `--font-family-base` - Inter font stack

**Font Sizes** (rem-based):
- `--font-size-xs` through `--font-size-3xl` - Scale from 0.7rem to 2rem

**Font Weights**:
- `--font-weight-normal` (400)
- `--font-weight-medium` (500)
- `--font-weight-semibold` (600)
- `--font-weight-bold` (700)

**Line Heights**:
- `--line-height-tight` (1.2)
- `--line-height-normal` (1.4)
- `--line-height-relaxed` (1.6)

**Letter Spacing**:
- `--letter-spacing-tight` (0.05em)
- `--letter-spacing-normal` (0.1em)

### Spacing

Base unit: 0.25rem (4px)

- `--spacing-1` through `--spacing-8` - Scale from 4px to 48px

### Border Radius

- `--radius-sm` (3px)
- `--radius-md` (4px)
- `--radius-lg` (6px)
- `--radius-xl` (8px)
- `--radius-full` (50%)

### Shadows

- `--shadow-sm` - Subtle shadow for cards
- `--shadow-md` - Medium shadow for elevated elements

### Transitions

- `--transition-fast` (0.2s)
- `--transition-base` (0.3s)

### Layout

- `--layout-sidebar-width` - Sidebar panel width
- `--layout-feed-width` - Feed panel width
- `--layout-gap` - Grid gap spacing
- `--layout-padding` - Container padding

## Usage

All components import the tokens file:

```scss
@import '../../../styles/tokens';

.my-component {
  color: var(--color-neutral-700);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
}
```

## Benefits

1. **Consistency** - All components use the same design values
2. **Maintainability** - Change tokens in one place to update entire app
3. **Theme Support** - Easy to add dark mode or other themes
4. **No Hardcoded Values** - All colors, spacing, and typography use tokens
5. **Type Safety** - Centralized design decisions

## File Structure

```
frontend/src/
├── styles/
│   └── _tokens.scss      # Design tokens definition
└── styles.scss           # Global styles importing tokens
```

All component SCSS files import tokens and use CSS custom properties (variables) instead of hardcoded values.
