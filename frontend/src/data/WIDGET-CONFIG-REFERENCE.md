# Widget Container Configuration Reference

Quick lookup table for size → behavior defaults.

---

## Size → Form Factor → Defaults

| Size | Form Factor | Label | Use Cases | Chrome | Header | Scroll | Density | Interaction | Overflow | Padding | Radius |
|------|-------------|-------|-----------|--------|--------|--------|---------|-------------|----------|---------|--------|
| 1×1  | `tile`      | Tile  | App launchers, clock, temp, quick-note | minimal | never | none | compact | selectable | hidden | sm | md |
| 2×1  | `strip`     | Strip | Horizontal lists, quick info | titlebar | hover | horizontal | compact | selectable | scroll | sm | md |
| 2×2  | `card`      | Card  | Balanced content, status monitors | titlebar | always | auto | normal | selectable | scroll | md | md |
| 3×2  | `panel`     | Panel | Wide dashboards, visualizations | full | always | both | comfortable | selectable | scroll | lg | md |
| 4×2  | `panel`     | Panel | Wide dashboards, visualizations | full | always | both | comfortable | selectable | scroll | lg | md |

---

## Behavior Flag Values

### chrome
- `none` - No decoration
- `minimal` - Basic border only
- `titlebar` - Title + basic controls
- `full` - Title + all controls + status

### headerDisplay
- `never` - No header visible
- `hover` - Header appears on hover
- `always` - Header always visible

### scroll
- `none` - No scrolling
- `vertical` - Y-axis only
- `horizontal` - X-axis only
- `both` - Both axes
- `auto` - Browser decides

### density
- `compact` - Tight spacing (4-8px)
- `normal` - Standard spacing (8-12px)
- `comfortable` - Relaxed spacing (12-16px)
- `spacious` - Generous spacing (16-24px)

### interaction
- `none` - No interaction
- `click-through` - Clickable to launch
- `selectable` - Can be selected/focused
- `draggable` - Can be dragged
- `editable` - Content is editable

### overflow
- `hidden` - Clip content
- `ellipsis` - Show "..."
- `wrap` - Wrap text/content
- `scroll` - Show scrollbars

### padding
- `none` - 0px
- `xs` - 4px
- `sm` - 8px
- `md` - 12px
- `lg` - 16px

### radius
- `none` - 0px (square corners)
- `sm` - 4px
- `md` - 8px
- `lg` - 12px
- `full` - 9999px (pill shape)

---

## Common Override Patterns

### 1×1 App Launcher
```js
containerBehavior: {
  interaction: 'click-through',  // Opens app
  chrome: 'none',
  headerDisplay: 'never'
}
```

### 1×1 Live Widget (clock, temp, gauge)
```js
containerBehavior: {
  interaction: 'none',      // Display only
  chrome: 'minimal',
  headerDisplay: 'never',
  overflow: 'hidden'
}
```

### 1×1 Editable Widget (quick-note)
```js
containerBehavior: {
  interaction: 'editable',  // Text input
  overflow: 'scroll',
  padding: 'xs'
}
```

### Make any widget non-interactive
```js
containerBehavior: {
  interaction: 'none',
  chrome: 'none'
}
```

### Data-dense monitoring widget
```js
containerBehavior: {
  density: 'compact',
  scroll: 'vertical',
  overflow: 'scroll'
}
```

### Full-screen visualization
```js
containerBehavior: {
  headerDisplay: 'hover',
  padding: 'none',
  scroll: 'none',
  overflow: 'hidden'
}
```

---

## Validation

All configs are validated against `BEHAVIOR_SCHEMA`. Invalid values will log warnings.

```js
import { validateBehaviorConfig } from './widget-container-config.js';

const result = validateBehaviorConfig({
  chrome: 'invalid-value',
  scroll: 'vertical'
});

// result.valid === false
// result.errors === ['Invalid value for chrome: invalid-value. Allowed: none, minimal, titlebar, full']
```

---

## Architecture Notes

**✅ DO:**
- Use size as layout source of truth
- Override specific behaviors per widget
- Add new sizes/behaviors to schema first
- Validate configs during development

**❌ DON'T:**
- Encode behavior into widget names
- Create size-specific rendering branches
- Assume behavior from form factor labels
- Skip validation in production
