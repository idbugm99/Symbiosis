# Widget Container Configuration Examples

## How It Works

**Source of truth:** Grid size (`2x1`) controls layout math
**Form factor:** Label derived from size (e.g., `strip`)
**Behavior:** Explicit flags control rendering

---

## Example 1: Using Defaults

Widget definition stays simple - size determines everything:

```js
{
  id: 'cas-quick-view',
  name: 'CAS Quick View',
  icon: '🧪',
  size: '2×1',  // ← This is all you need
  cols: 2,
  rows: 1,
  // ... rest of widget definition
}
```

Controller automatically gets:
```js
import { getContainerConfig } from './widget-container-config.js';

const config = getContainerConfig('2x1');
// Returns:
// {
//   size: '2x1',
//   grid: { w: 2, h: 1 },
//   form_factor: 'strip',
//   chrome: 'titlebar',
//   headerDisplay: 'hover',
//   scroll: 'horizontal',
//   density: 'compact',
//   interaction: 'selectable',
//   overflow: 'scroll',
//   padding: 'sm',
//   radius: 'md'
// }
```

---

## Example 2: 1×1 Apps vs 1×1 Widgets

Both use the same size (`1x1`) but have different behavior:

### 1×1 App Launcher (click to open)
```js
{
  id: 'chemicals-app',
  name: 'Chemicals',
  icon: '🧪',
  type: 'app',
  size: '1×1',

  // Override for launcher behavior
  containerBehavior: {
    interaction: 'click-through',  // Click opens app
    headerDisplay: 'never',        // Clean icon
    chrome: 'none'                 // No decoration
  }
}
```

### 1×1 Widget (live content display)
```js
{
  id: 'clock-widget',
  name: 'Clock',
  icon: '🕐',
  type: 'widget',
  size: '1×1',

  // Override for live widget
  containerBehavior: {
    interaction: 'none',      // Just display, no click
    headerDisplay: 'never',   // Clean display
    overflow: 'hidden'        // Clip content to tile
  }
}
```

### 1×1 Editable Widget
```js
{
  id: 'quick-note',
  name: 'Quick Note',
  icon: '✏️',
  type: 'widget',
  size: '1×1',

  // Override for editable widget
  containerBehavior: {
    interaction: 'editable',  // Text input
    headerDisplay: 'never',   // Minimal
    overflow: 'scroll',       // Allow scrolling text
    padding: 'xs'             // Maximize text area
  }
}
```

Controller merges:
```js
const config = getContainerConfig(widget.size, widget.containerBehavior);
// Defaults for 1x1 'tile' + overrides merged
```

---

## Example 3: Same Size, Different Behavior

Two `2x1` widgets with completely different interactions:

```js
// Horizontal list (default strip behavior)
{
  id: 'favorites',
  size: '2×1',
  // Uses all strip defaults
}

// Editable text field (override strip behavior)
{
  id: 'search-bar',
  size: '2×1',
  containerBehavior: {
    chrome: 'none',            // No titlebar
    headerDisplay: 'never',
    scroll: 'none',
    interaction: 'editable',   // Text input
    padding: 'xs'
  }
}
```

Both are `2x1`. Same container code. Different rendering.

---

## Example 4: Large Dashboard Widget

```js
{
  id: 'panel-viewer',
  name: 'Panel Viewer',
  icon: '🧬',
  size: '4×2',
  cols: 4,
  rows: 2,

  // Panel defaults are good, but tweak a few things
  containerBehavior: {
    headerDisplay: 'hover',    // Override 'always'
    density: 'spacious'        // More breathing room
  }
}
```

---

## Controller Integration Pattern

```js
// widget-ui-controller.js

renderWidget(widgetInstance, widgetDefinition) {
  // Get container behavior config
  const containerConfig = getContainerConfig(
    widgetDefinition.size,
    widgetDefinition.containerBehavior || {}
  );

  // Use config for rendering
  const container = this.createContainer(widgetInstance.id, containerConfig);

  // Apply chrome based on config
  if (containerConfig.chrome !== 'none') {
    this.addHeader(container, widgetDefinition, containerConfig);
  }

  // Apply scroll behavior
  container.style.overflow = this.getOverflowStyle(containerConfig.scroll);

  // Apply density spacing
  container.classList.add(`density-${containerConfig.density}`);

  // Apply interaction mode
  if (containerConfig.interaction === 'editable') {
    this.makeEditable(container);
  }

  return container;
}
```

---

## Adding New Sizes

Want to add `3x1`? Just extend the config:

```js
// widget-container-config.js

SIZE_TO_FORM_FACTOR = {
  '1x1': 'icon',
  '2x1': 'strip',
  '3x1': 'banner',  // ← New size
  '2x2': 'card',
  '3x2': 'panel',
  '4x2': 'panel'
};

FORM_FACTORS = {
  // ... existing ...

  'banner': {
    sizes: ['3x1'],
    label: 'Banner',
    description: 'Wide horizontal banner for notifications',
    defaults: {
      chrome: 'minimal',
      headerDisplay: 'never',
      scroll: 'horizontal',
      density: 'compact',
      interaction: 'click-through',
      overflow: 'ellipsis',
      padding: 'md',
      radius: 'lg'
    }
  }
};
```

No breaking changes. All existing widgets still work.

---

## Summary

✅ **Size = Layout Truth**: `2x1` controls grid math
✅ **Form Factor = Label**: Readable name + default bundle
✅ **Flags = Behavior**: Explicit properties control rendering
✅ **Overrides = Flexibility**: Per-widget customization
✅ **Extensible**: Add sizes/behaviors without refactoring

**Never bake behavior into names. Let flags do the work.**
