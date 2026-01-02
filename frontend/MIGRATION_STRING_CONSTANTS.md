# String Literal to Constants Migration Guide

## Overview

This guide covers migrating from string literals to type-safe constants throughout the codebase.

## What Changed

Added type-safe constants in `src/types/index.ts`:
- `WidgetType` - for 'widget' | 'app'
- `DisplayMode` - for display modes
- `AnimationType` - for animation types
- `HeaderDisplay` - for header display modes
- `LaunchTrigger` - for launch triggers
- `MenuBarPosition` - for menu bar positions
- `DockAppType` - for dock app types

## Migration Steps

### 1. Import the constants

```typescript
import {
  WidgetType,
  DisplayMode,
  HeaderDisplay,
  LaunchTrigger
} from './types/index.js';
```

### 2. Replace string literals with constants

#### Widget/App Type
```typescript
// Before
if (widget.type === 'app') { }
if (definition.type === 'widget') { }

// After
if (widget.type === WidgetType.APP) { }
if (definition.type === WidgetType.WIDGET) { }
```

#### Display Mode
```typescript
// Before
if (displayMode === 'popup' || displayMode === 'modal') { }
const settings = { displayMode: 'fullscreen' };

// After
if (displayMode === DisplayMode.POPUP || displayMode === DisplayMode.MODAL) { }
const settings = { displayMode: DisplayMode.FULLSCREEN };
```

#### Header Display
```typescript
// Before
if (headerDisplay === 'never') { }

// After
if (headerDisplay === HeaderDisplay.NEVER) { }
```

#### Launch Trigger
```typescript
// Before
if (launchTrigger === 'doubleClick') { }

// After
if (launchTrigger === LaunchTrigger.DOUBLE_CLICK) { }
```

## Files to Update

### High Priority (most comparisons)
- [ ] `src/managers/widget-manager.ts`
- [ ] `src/managers/widget-ui-controller.ts`
- [ ] `src/managers/app-ui-controller.ts`
- [ ] `src/managers/widget-interactions.ts`
- [ ] `src/managers/dock-manager.ts`

### Medium Priority
- [ ] `src/orchestrators/desktop-initializer.ts`
- [ ] `src/plugins/menubar/*.ts`
- [ ] Widget component files

### Low Priority
- [ ] Test files
- [ ] Configuration files

## Search Patterns

Use these patterns to find code that needs updating:

```bash
# Find widget/app type comparisons
grep -r "=== 'app'" src/
grep -r "=== 'widget'" src/
grep -r "type === '" src/

# Find display mode comparisons
grep -r "=== 'popup'" src/
grep -r "=== 'modal'" src/
grep -r "=== 'fullscreen'" src/

# Find header display comparisons
grep -r "=== 'never'" src/
grep -r "=== 'always'" src/
grep -r "=== 'hover'" src/

# Find launch trigger comparisons
grep -r "=== 'click'" src/
grep -r "=== 'doubleClick'" src/
grep -r "=== 'longPress'" src/
```

## Benefits

✅ **Autocomplete** - IDE suggests valid values as you type
✅ **Type Safety** - Compile-time errors for invalid values
✅ **Refactoring** - Rename in one place, updates everywhere
✅ **Searchability** - "Find all references" works perfectly
✅ **No Runtime Cost** - Still just strings under the hood

## Gradual Migration

This migration can be done **incrementally**:
1. New code should always use constants
2. Update existing code file-by-file as you work on it
3. No breaking changes - both approaches work during transition
4. Eventually can enforce with ESLint rule (optional)

## Questions?

Refer to examples in `src/types/index.ts` or search for existing usage of the constants.
