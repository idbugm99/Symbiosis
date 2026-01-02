# HotkeyManager Developer Guide

## Overview

The **HotkeyManager** provides centralized, focus-aware keyboard shortcut handling for Symbiosis. It prevents conflicts between workspace and app hotkeys by routing keyboard events based on which context has focus.

## Architecture

```
┌─────────────────────────────────────┐
│     HotkeyManager                   │
│  • Focus-aware routing              │
│  • Conflict prevention              │
│  • Automatic cleanup                │
└─────────────────────────────────────┘
           ↓                ↓
    ┌──────────┐      ┌──────────┐
    │Workspace │      │   App    │
    │ Hotkeys  │      │ Hotkeys  │
    │Ctrl+1-9  │      │Ctrl+S    │
    │Ctrl+N    │      │Ctrl+F    │
    │ESC       │      │etc.      │
    └──────────┘      └──────────┘
```

## Priority System

Hotkeys are routed with the following priority:

1. **Active App Hotkeys** (highest) - If an app has focus, its hotkeys take precedence
2. **Workspace Hotkeys** (medium) - Active only when no app has focus
3. **Browser Defaults** (lowest) - Only if no handler registered

**Result:** Apps can safely use `Ctrl+1` for "Switch to tab 1" even though workspace uses `Ctrl+1` for "Switch to workspace 1" - they won't conflict!

## For App Developers

### Registering App Hotkeys

When your app opens, register its hotkeys:

```javascript
// In your app's initialization code
const hotkeyManager = window.hotkeyManager; // Global reference
const appInstanceId = 'my-app-12345'; // Unique instance ID

// Register hotkeys for THIS app instance
hotkeyManager.registerAppHotkey(
  appInstanceId,
  'Ctrl+S',
  () => {
    console.log('Saving document...');
    this.saveDocument();
  },
  'Save document'  // Description (optional, for debugging)
);

hotkeyManager.registerAppHotkey(
  appInstanceId,
  'Ctrl+F',
  () => {
    this.openFindDialog();
  },
  'Open find dialog'
);

hotkeyManager.registerAppHotkey(
  appInstanceId,
  'Ctrl+1',
  () => {
    this.switchToTab(1);
  },
  'Switch to tab 1'
);
```

### App Lifecycle Integration

#### When App Opens (AppUIController handles this)

```javascript
openApp(appId, instanceSettings, sourceWidget) {
  const instanceId = `${appId}-${Date.now()}`;

  // Open app window...

  // AUTOMATIC: ESC key is registered for all apps to close them
  // You don't need to register ESC manually!

  // Apps can register their additional hotkeys here or in their init() method
  // Pass instanceId to app so it can register hotkeys
  app.init(instanceId);

  return instanceId;
}
```

#### Default Hotkeys (Automatic)

Every app **automatically** gets these hotkeys registered:

- **ESC** - Closes the app (no need to register manually)

You can override ESC if needed by registering it again with your own handler.

#### When App Closes (Automatic Cleanup)

Hotkeys are **automatically cleaned up** when the app closes. The HotkeyManager removes all hotkeys for that instance.

**NO MANUAL CLEANUP NEEDED!**

Desktop.js already handles this in the `onAppClosed` callback:

```javascript
onAppClosed: (instanceId, appId) => {
  // HotkeyManager automatically unregisters hotkeys
  console.log(`App closed: ${appId} (${instanceId})`);
}
```

### Supported Key Combinations

#### Modifiers

- `Ctrl` - Control key (use this for Windows/Linux)
- `Alt` - Alt key
- `Shift` - Shift key
- `Meta` - Command key (Mac) / Windows key

#### Special Keys

- `Escape` / `ESC` - Escape key
- `Enter` / `Return` - Enter key
- `Space` - Space bar
- `Tab` - Tab key
- `Backspace` - Backspace
- `Delete` / `Del` - Delete key
- `F1`-`F12` - Function keys
- `ArrowUp` / `Up` - Up arrow
- `ArrowDown` / `Down` - Down arrow
- `ArrowLeft` / `Left` - Left arrow
- `ArrowRight` / `Right` - Right arrow

#### Regular Keys

- `A`-`Z` - Letters (case-insensitive, normalized to uppercase)
- `0`-`9` - Numbers
- Any symbol key (`,`, `.`, `/`, etc.)

### Example: Complete App Integration

```javascript
// my-app.js
class MyApp {
  constructor(instanceId, appUIController, hotkeyManager) {
    this.instanceId = instanceId;
    this.appUIController = appUIController;
    this.hotkeyManager = hotkeyManager;

    this.registerHotkeys();
  }

  registerHotkeys() {
    // Save
    this.hotkeyManager.registerAppHotkey(
      this.instanceId,
      'Ctrl+S',
      () => this.save(),
      'Save'
    );

    // Save As
    this.hotkeyManager.registerAppHotkey(
      this.instanceId,
      'Ctrl+Shift+S',
      () => this.saveAs(),
      'Save As'
    );

    // Find
    this.hotkeyManager.registerAppHotkey(
      this.instanceId,
      'Ctrl+F',
      () => this.find(),
      'Find'
    );

    // New Document
    this.hotkeyManager.registerAppHotkey(
      this.instanceId,
      'Ctrl+N',
      () => this.newDocument(),
      'New Document'
    );

    // Print
    this.hotkeyManager.registerAppHotkey(
      this.instanceId,
      'Ctrl+P',
      (e) => {
        e.preventDefault(); // Prevent browser print dialog
        this.print();
      },
      'Print'
    );

    // Tab switching
    for (let i = 1; i <= 9; i++) {
      this.hotkeyManager.registerAppHotkey(
        this.instanceId,
        `Ctrl+${i}`,
        () => this.switchToTab(i),
        `Switch to tab ${i}`
      );
    }

    console.log(`Registered hotkeys for ${this.instanceId}`);
  }

  save() {
    console.log('Saving...');
    // Save logic
  }

  // ... other methods
}
```

## For Workspace Developers

### Registering Workspace Hotkeys

Workspace hotkeys are registered in `desktop.js`:

```javascript
registerWorkspaceHotkeys() {
  // Workspace switching: Ctrl+1 through Ctrl+9
  for (let i = 1; i <= 9; i++) {
    this.hotkeyManager.registerWorkspaceHotkey(
      `Ctrl+${i}`,
      () => {
        const workspaces = this.workspaceManager.workspaces;
        if (i <= workspaces.length) {
          const workspace = workspaces[i - 1];
          this.workspaceManager.switchWorkspace(workspace.id);
        }
      },
      `Switch to workspace ${i}`
    );
  }

  // Open widget drawer: Ctrl+N
  this.hotkeyManager.registerWorkspaceHotkey(
    'Ctrl+N',
    () => this.openDrawer(),
    'Open widget drawer'
  );

  // Close app: ESC
  this.hotkeyManager.registerWorkspaceHotkey(
    'Escape',
    () => {
      if (this.appUIController.activeAppInstanceId) {
        this.appUIController.closeApp(this.appUIController.activeAppInstanceId);
      }
    },
    'Close active app'
  );
}
```

## Focus Management

### How Focus Works

- **App has focus**: When `AppUIController.activeAppInstanceId` is set (non-null)
- **Workspace has focus**: When `activeAppInstanceId` is `null`

Focus is automatically managed by `AppUIController`:
- When app opens → `activeAppInstanceId` is set → App hotkeys active
- When app closes → `activeAppInstanceId` cleared → Workspace hotkeys active

### Testing Focus

```javascript
// Check current focus
const focused = window.hotkeyManager.focusProvider.activeAppInstanceId;
if (focused) {
  console.log('App has focus:', focused);
} else {
  console.log('Workspace has focus');
}

// View all registered hotkeys
window.hotkeyManager.logAllHotkeys();
```

## Debugging

### View All Hotkeys

```javascript
// In browser console
window.hotkeyManager.logAllHotkeys();
```

Output:
```
=== HotkeyManager: All Registered Hotkeys ===

Workspace Hotkeys:
  Ctrl+1 - Switch to workspace 1
  Ctrl+2 - Switch to workspace 2
  ...
  Ctrl+N - Open widget drawer
  Escape - Close active app

App Hotkeys:
  chemicals-app-1234567890:
    Ctrl+S - Save compound
    Ctrl+F - Find compound
    Ctrl+N - New compound
  notebook-app-9876543210:
    Ctrl+S - Save note
    Ctrl+1 - Switch to tab 1
    Ctrl+2 - Switch to tab 2

===========================================
```

### Check if Combo is Registered

```javascript
const result = window.hotkeyManager.isComboRegistered('Ctrl+S');
console.log(result);
// { registered: true, context: 'chemicals-app-1234567890' }
// OR { registered: false, context: null }
```

### Get Active Hotkeys Programmatically

```javascript
const hotkeys = window.hotkeyManager.getActiveHotkeys();
console.log(hotkeys);
// {
//   workspace: [
//     { combo: 'Ctrl+1', description: 'Switch to workspace 1' },
//     ...
//   ],
//   apps: {
//     'chemicals-app-1234567890': [
//       { combo: 'Ctrl+S', description: 'Save compound' },
//       ...
//     ]
//   }
// }
```

## Best Practices

### DO ✅

1. **Use descriptive descriptions** - Makes debugging easier
   ```javascript
   hotkeyManager.registerAppHotkey(id, 'Ctrl+S', handler, 'Save document');
   ```

2. **Register hotkeys in app constructor/init** - Ensures they're ready immediately

3. **Use `Ctrl` for cross-platform shortcuts** - Works on Windows, Mac, Linux

4. **Prevent default when needed** - Handler receives event object
   ```javascript
   (e) => {
     e.preventDefault(); // Prevent browser action
     this.customPrint();
   }
   ```

5. **Use consistent patterns** - `Ctrl+S` = Save, `Ctrl+F` = Find, etc.

### DON'T ❌

1. **Don't manually clean up hotkeys** - Automatic cleanup on app close

2. **Don't register the same combo twice** - Will overwrite (warning logged)

3. **Don't use browser-reserved combos** - Ctrl+T (new tab), Ctrl+W (close tab), etc. will be blocked by browser

4. **Don't forget preventDefault for browser shortcuts** - `Ctrl+P`, `Ctrl+N`, etc.

## Common Patterns

### Text Editor App

```javascript
// Save, Find, Replace, New, Open
hotkeyManager.registerAppHotkey(id, 'Ctrl+S', () => this.save(), 'Save');
hotkeyManager.registerAppHotkey(id, 'Ctrl+F', () => this.find(), 'Find');
hotkeyManager.registerAppHotkey(id, 'Ctrl+H', () => this.replace(), 'Replace');
hotkeyManager.registerAppHotkey(id, 'Ctrl+N', () => this.newDoc(), 'New');
hotkeyManager.registerAppHotkey(id, 'Ctrl+O', () => this.open(), 'Open');
```

### Tabbed App

```javascript
// Tab navigation
for (let i = 1; i <= 9; i++) {
  hotkeyManager.registerAppHotkey(id, `Ctrl+${i}`, () => this.switchTab(i), `Tab ${i}`);
}
hotkeyManager.registerAppHotkey(id, 'Ctrl+Tab', () => this.nextTab(), 'Next tab');
hotkeyManager.registerAppHotkey(id, 'Ctrl+Shift+Tab', () => this.prevTab(), 'Prev tab');
```

### Form-Based App

```javascript
// Submit, Reset, Navigate
hotkeyManager.registerAppHotkey(id, 'Ctrl+Enter', () => this.submit(), 'Submit');
hotkeyManager.registerAppHotkey(id, 'Ctrl+R', () => this.reset(), 'Reset');
hotkeyManager.registerAppHotkey(id, 'Ctrl+ArrowDown', () => this.nextField(), 'Next');
hotkeyManager.registerAppHotkey(id, 'Ctrl+ArrowUp', () => this.prevField(), 'Previous');
```

## Summary

✅ **Centralized** - All hotkeys managed by HotkeyManager
✅ **Focus-aware** - Apps and workspace don't conflict
✅ **Automatic cleanup** - No memory leaks
✅ **ESC key automatic** - All apps can be closed with ESC by default
✅ **Flexible** - Apps can use any combo, including workspace combos
✅ **Debuggable** - Built-in logging and inspection tools

**No more hotkey conflicts!** 🎉
