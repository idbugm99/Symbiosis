# Widget Wiggle Mode - Feature Guide

## How It Works

### Entering Wiggle Mode
**Long-press any widget** (hold for 500ms without moving) to enter wiggle mode.

### While in Wiggle Mode:
- ✅ **All widgets start shaking** (2° rotation wiggle animation)
- ✅ **Red [×] delete button appears** in the top-right corner of each widget
- ✅ **Widgets can still be dragged** to reposition them
- ✅ **Click and hold to move** widgets to new positions

### Exiting Wiggle Mode:
- Click anywhere **outside** a widget
- Press **ESC** key
- Delete a widget (exits automatically after deletion)

### Deleting a Widget:
1. Long-press a widget to enter wiggle mode
2. Click the red [×] button on the widget you want to delete
3. Confirm the deletion in the dialog
4. Widget animates out and is removed

---

## Implementation Details

### WidgetUIController Methods:

#### `enterWiggleMode(widgetId, allWidgets = true)`
Enters wiggle mode for all widgets (default) or a specific widget.

```javascript
widgetUIController.enterWiggleMode('widget-123'); // All widgets wiggle
widgetUIController.enterWiggleMode('widget-123', false); // Only widget-123 wiggles
```

#### `exitWiggleMode()`
Exits wiggle mode, stops all wiggling, and removes delete buttons.

```javascript
widgetUIController.exitWiggleMode();
```

#### `isWiggleMode()`
Check if wiggle mode is currently active.

```javascript
if (widgetUIController.isWiggleMode()) {
  console.log('Wiggle mode active!');
}
```

#### `isWidgetWiggling(widgetId)`
Check if a specific widget is wiggling.

```javascript
if (widgetUIController.isWidgetWiggling('widget-123')) {
  console.log('Widget is wiggling');
}
```

---

## CSS Classes

### `.widget.wiggling`
Applied to widgets in wiggle mode.
- Rotates ±2° in a continuous loop
- Increases z-index to 100

### `.widget-delete-btn`
The red [×] delete button.
- Positioned absolutely at top-right (-8px, -8px)
- 24px circular button
- Red background (#ff3b30)
- White border
- Pops in with bounce animation
- Scales up on hover (1.15×)

---

## User Experience Flow

### Scenario 1: Delete a Widget
1. User long-presses "Inventory Alerts" widget
2. All widgets start wiggling
3. Red [×] appears on all widgets
4. User clicks [×] on "Inventory Alerts"
5. Confirmation: "Delete Inventory Alerts?"
6. User confirms
7. Widget fades out and removes
8. Wiggle mode exits automatically

### Scenario 2: Rearrange Widgets
1. User long-presses any widget
2. All widgets start wiggling
3. User drags "CAS Quick View" to a new position
4. Widget moves (drag-and-drop still works)
5. User clicks outside widgets to exit wiggle mode
6. All widgets stop wiggling

### Scenario 3: Cancel Wiggle Mode
1. User long-presses widget
2. Wiggle mode activates
3. User changes their mind
4. User presses ESC or clicks outside
5. Wiggle mode exits, no changes made

---

## Configuration Options

### Long-Press Delay
Default: 500ms

```javascript
const widgetUIController = new WidgetUIController({
  longPressDelay: 500 // Adjust timing
});
```

### Callbacks

```javascript
const widgetUIController = new WidgetUIController({
  onWidgetDelete: (widgetId) => {
    console.log('Widget deleted:', widgetId);
    // Update backend, analytics, etc.
  },
  onWidgetLongPress: (widgetInstance, event) => {
    console.log('Widget long-pressed:', widgetInstance.id);
  }
});
```

---

## Special Cases

### Widgets with Long-Press Launch
If a widget has `launchTrigger: 'longPress'`, it will launch the app instead of entering wiggle mode.

```javascript
// widgets-only-static.js
{
  id: 'special-widget',
  launchesApp: 'chemicals-app',
  launchTrigger: 'longPress', // This takes priority
  // ... other properties
}
```

**Behavior:** Long-press launches the app, wiggle mode NOT triggered.

### Alternative Access to Wiggle Mode
If needed, you can trigger wiggle mode programmatically:

```javascript
// Add a button or menu item
document.getElementById('edit-widgets-btn').addEventListener('click', () => {
  widgetUIController.enterWiggleMode();
});
```

---

## Animation Specifications

### Wiggle Animation
```css
@keyframes wiggle {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-2deg); }
  50% { transform: rotate(0deg); }
  75% { transform: rotate(2deg); }
  100% { transform: rotate(0deg); }
}
```
- Duration: 0.5s
- Easing: ease-in-out
- Infinite loop

### Delete Button Pop-In
```css
@keyframes deleteButtonPop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
```
- Duration: 0.3s
- Easing: cubic-bezier(0.34, 1.56, 0.64, 1) (bounce)

---

## Accessibility

- ✅ Delete button has `title="Delete widget"` for tooltips
- ✅ Keyboard support: ESC to exit wiggle mode
- ✅ Confirmation dialog prevents accidental deletion
- ✅ Visual feedback: wiggle animation + red button clearly indicate edit mode

---

## Testing Checklist

- [ ] Long-press enters wiggle mode
- [ ] All widgets wiggle simultaneously
- [ ] Red [×] buttons appear on all widgets
- [ ] Click [×] shows confirmation dialog
- [ ] Confirm deletes widget
- [ ] Cancel keeps widget
- [ ] Click outside exits wiggle mode
- [ ] ESC exits wiggle mode
- [ ] Drag-to-move still works while wiggling
- [ ] Widget with `launchTrigger: 'longPress'` launches app instead
- [ ] Delete removes widget from WidgetManager data
- [ ] Wiggle mode works on mobile (touch events)

---

## Future Enhancements (Optional)

### Multi-Select Delete
- Tap multiple [×] buttons to mark for deletion
- Single "Delete All Selected" confirmation

### Wiggle Intensity Control
- User preference: mild vs aggressive wiggle
- Accessibility: option to disable animation

### Batch Operations
- Select multiple widgets
- Move as group
- Delete as batch

### Undo Delete
- "Undo" notification after deletion
- 5-second window to restore

---

**Wiggle mode is now fully implemented!** 🎉

Test it by long-pressing any widget on your dashboard.
