# Symbiosis Desktop Interface

## Overview

The Symbiosis Desktop provides a widget-based, customizable workspace inspired by modern mobile operating systems (iOS/Android). Users can drag and drop widgets to create personalized research dashboards.

---

## Design Philosophy

### Zero Learning Curve
- **Familiar interactions**: Behaves like iPad/Android home screens
- **Intuitive drag-and-drop**: No tutorial needed
- **Visual feedback**: Clear hover states and animations

### Modular & Scalable
- **Widget-based architecture**: Each feature is a standalone widget
- **Grid layout system**: 3 columns × 4 rows (12 cells)
- **Resizable widgets**: 1×1, 2×1, 2×2, 4×2 sizes

### Role-Based Defaults
- **Researcher**: CAS Quick View, Equipment Status, Notebook
- **Supervisor**: Maintenance Alerts, Ordering Summary, Progress
- **Student**: Simplified viewers, Educational mode, AI Explain

---

## Interface Components

### 1. Top Bar (Persistent)

```
┌─────────────────────────────────────────────────────────┐
│ 🔬 Symbiosis   Workspace: Default ▼   [Search]  🔔 ⚙️ 👤 │
└─────────────────────────────────────────────────────────┘
```

**Left Side**:
- Logo and branding
- Workspace selector (save/load layouts)

**Right Side**:
- Global search bar
- Notifications (with badge)
- Settings
- User profile menu

---

### 2. Desktop Grid (Main Area)

Empty state shows 12 numbered cells in a 3×4 grid:

```
┌───────┐ ┌───────┐ ┌───────┐
│   1   │ │   2   │ │   3   │
└───────┘ └───────┘ └───────┘

┌───────┐ ┌───────┐ ┌───────┐
│   4   │ │   5   │ │   6   │
└───────┘ └───────┘ └───────┘

┌───────┐ ┌───────┐ ┌───────┐
│   7   │ │   8   │ │   9   │
└───────┘ └───────┘ └───────┘

┌───────┐ ┌───────┐ ┌───────┐
│  10   │ │  11   │ │  12   │
└───────┘ └───────┘ └───────┘
```

**Features**:
- Dotted-line placeholders when empty
- Drag targets highlight on hover
- Widgets snap to grid
- Smooth animations

---

### 3. App Dock (Bottom)

```
┌───────────────────────────────────────────────────┐
│  🔍    📓    🔬    🧪    📦    ✓    │    ⚙️     │
│ Search Notebook Equipment Chemicals Vendors Tasks Settings│
└───────────────────────────────────────────────────┘
```

**System Apps** (always available):
1. **Search** - Global search across all data
2. **Notebook** - Research notes and experiments
3. **Equipment** - Lab equipment management
4. **Chemicals** - CAS database and inventory
5. **Vendors** - Supplier catalog and orders
6. **Tasks** - Lab task management
7. **Settings** - System configuration

**Design**:
- Rounded-square icons (iOS-style)
- Hover effect: slight lift animation
- Divider before Settings
- Glassmorphism effect (blur + transparency)

---

### 4. Widget Drawer (Slide-up Panel)

Activated by "+ Add Widget" button or dock action.

```
┌─────────────────────────────────────────────┐
│              ━━━  (handle)                  │
│                                             │
│  Add Widget                                 │
│  Drag widgets to your desktop              │
│                                             │
│  🧪 Chemicals                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │🧪 CAS   │ │⭐ Faves │ │📊 Alerts│      │
│  │Quick    │ │         │ │         │      │
│  │View     │ │         │ │         │      │
│  │[1×1]    │ │[2×1]    │ │[2×2]    │      │
│  └─────────┘ └─────────┘ └─────────┘      │
│                                             │
│  🔬 Equipment                               │
│  [Widget cards...]                          │
│                                             │
│  🧬 Genetics                                │
│  [Widget cards...]                          │
│                                             │
│  📦 Vendor Tools                            │
│  🤖 AI Assistant                            │
│  📓 Research Notes                          │
└─────────────────────────────────────────────┘
```

**Categories**:
1. **Chemicals**: CAS Quick View, Favorites, Inventory Alerts
2. **Equipment**: Calibration Schedule, Status Monitor, Inventory
3. **Genetics**: Panel Viewer, Marker List
4. **Vendor Tools**: Reorder Alerts, Vendor Catalog
5. **AI Assistant**: Literature Summary, SOP Generator, Explain Mode
6. **Research Notes**: Quick Note, Notebook Overview

**Widget Cards Include**:
- Icon (emoji or gradient)
- Name
- Description
- Size indicator (1×1, 2×1, 2×2, 4×2)
- Draggable

---

## User Interactions

### Adding Widgets

1. Click "+ Add Widget" button
2. Drawer slides up from bottom
3. Browse widget categories
4. Drag widget card to desired grid cell
5. Widget snaps into place
6. Drawer automatically closes

**Visual Feedback**:
- Card becomes translucent while dragging
- Target cell highlights in blue
- Smooth drop animation

---

### Managing Widgets

#### Long Press (Mobile-style)
Hold widget for 1 second → Action menu appears:
- **Move** - Drag to new position
- **Resize** - Change widget size (if supported)
- **Configure** - Widget-specific settings
- **Remove** - Delete from desktop
- **Duplicate** - Create copy

#### Quick Actions
- **Three-dot menu** (⋯) in widget header
- Click for instant access to same actions

---

### Workspace Management

**Save Layout**:
- Click "Workspace: Default ▼"
- Select "Save Current Layout"
- Name your workspace (e.g., "Genetics Research", "Daily Lab")

**Load Layout**:
- Click workspace selector
- Choose from saved workspaces
- Desktop instantly updates

**Share Layout** (future):
- Export workspace as JSON
- Import colleague's workspace
- Template library

---

## Widget Specifications

### Widget Sizes

| Size | Grid Cells | Dimensions | Best For |
|------|------------|------------|----------|
| 1×1  | 1 cell     | 120×120px  | Quick stats, buttons |
| 2×1  | 2 cells    | 260×120px  | Lists, progress bars |
| 2×2  | 4 cells    | 260×260px  | Dashboards, charts |
| 4×2  | 8 cells    | 540×260px  | Panoramic views, panels |

### Widget Anatomy

```
┌─────────────────────────────┐
│ 🧪 CAS Quick View      ⋯    │ ← Header
├─────────────────────────────┤
│                             │
│    Widget Content           │ ← Body
│    (Data/Charts/Forms)      │
│                             │
└─────────────────────────────┘
```

**Header**:
- Icon (left)
- Title (center)
- Menu button (right)

**Body**:
- Widget-specific content
- Scrollable if needed
- Loading states
- Error handling

---

## Default Layouts by Role

### Researcher (Camille's Default)

```
┌─────────┬─────────┬─────────┐
│ CAS     │ Recent  │ Quick   │
│ Quick   │ Chems   │ Note    │
│ View    │         │         │
│ [1×1]   │ [1×1]   │ [1×1]   │
├─────────┴─────────┴─────────┤
│ Equipment Status            │
│ [3×1]                       │
├─────────┬─────────┬─────────┤
│ Notebook          │ AI      │
│ Overview          │ Explain │
│ [2×2]             │ [1×2]   │
│                   │         │
└───────────────────┴─────────┘
```

### Supervisor

```
┌─────────────────┬───────────┐
│ Maintenance     │ Team      │
│ Alerts          │ Progress  │
│ [2×2]           │ [1×2]     │
│                 │           │
├─────────────────┼───────────┤
│ Ordering        │ Inventory │
│ Summary         │ Alerts    │
│ [2×1]           │ [1×1]     │
└─────────────────┴───────────┘
```

### Student (Simplified)

```
┌─────────┬─────────┬─────────┐
│ Explain │ CAS     │ Quick   │
│ This    │ Viewer  │ Note    │
│ [1×1]   │ [1×1]   │ [1×1]   │
├─────────┴─────────┴─────────┤
│ Recent Notes & Experiments  │
│ [3×1]                       │
└─────────────────────────────┘
```

---

## Technical Implementation

### State Management

Workspace configuration stored in `localStorage`:

```json
{
  "name": "Default",
  "widgets": [
    {
      "id": "widget-1234567890",
      "type": "cas-quick-view",
      "name": "CAS Quick View",
      "icon": "🧪",
      "size": "1×1",
      "cell": 1,
      "config": {}
    }
  ],
  "lastModified": "2025-11-18T12:00:00Z"
}
```

### Drag and Drop API

Uses native HTML5 Drag and Drop:
- `dragstart` - Initialize drag data
- `dragover` - Allow drop
- `drop` - Handle widget placement
- `dragend` - Clean up

### Persistence

- **Auto-save**: On every widget add/remove/move
- **Multi-device**: Sync via Firebase (future)
- **Backup**: Export/import workspace JSON

---

## Responsive Design

### Desktop (≥1200px)
- Full 3×4 grid
- All features visible
- Optimal experience

### Tablet (768px - 1199px)
- 2×6 grid (2 columns, 6 rows)
- Dock icons slightly smaller
- Top bar condensed

### Mobile (< 768px)
- 1×12 grid (1 column, 12 rows)
- Vertical scrolling
- Drawer full-screen
- Simplified dock (bottom navigation)

---

## Accessibility

- **Keyboard navigation**: Tab through widgets, Enter to activate
- **Screen readers**: ARIA labels on all interactive elements
- **Focus indicators**: Clear outline on keyboard focus
- **High contrast**: Support for system preferences
- **Touch targets**: Minimum 44×44px for mobile

---

## Future Enhancements

### Phase 1 (MVP) ✅
- Basic grid layout
- Drag and drop
- Widget drawer
- Dock apps
- Workspace save/load

### Phase 2
- Widget resize handles
- Multi-size widgets (1×1, 2×1, 2×2, 4×2)
- Widget configuration modals
- Search functionality
- Notification system

### Phase 3
- Real-time data in widgets
- Widget animations and transitions
- Collaborative workspaces
- Widget marketplace
- Custom widget creation

### Phase 4
- AI-suggested layouts
- Smart widget recommendations
- Cross-device sync
- Gesture controls
- Voice commands

---

## Performance Considerations

### Optimization
- **Lazy loading**: Widgets load content on demand
- **Virtual scrolling**: For large widget lists
- **Debounced saves**: Prevent excessive localStorage writes
- **Minimal re-renders**: Only update changed widgets

### Best Practices
- Maximum 12 widgets per workspace
- Widget content pagination
- Cached API responses
- Progressive image loading

---

## Testing Checklist

- [ ] Drag widget from drawer to grid
- [ ] Drop widget on empty cell
- [ ] Prevent drop on occupied cell
- [ ] Widget persists after page refresh
- [ ] Remove widget via menu
- [ ] Clear all widgets
- [ ] Save workspace with custom name
- [ ] Load saved workspace
- [ ] Dock app navigation
- [ ] Top bar search
- [ ] Workspace selector
- [ ] Responsive layout (mobile/tablet/desktop)
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

---

**Last Updated**: 2025-11-18
**Status**: MVP Complete
**Next Steps**: Implement real widget content
