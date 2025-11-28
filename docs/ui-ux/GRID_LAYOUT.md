# Symbiosis Desktop - Grid Layout System

## Overview
The desktop uses an invisible grid system optimized for 1440px displays to maximize widget capacity while maintaining a clean, professional appearance.

---

## Grid Specifications

### Desktop Layout (1440px wide)

**Grid Configuration**:
- **Columns**: 6
- **Rows**: 5
- **Total Cells**: 30 widgets
- **Cell Size**: 140px × 140px
- **Gap**: 24px
- **Total Width**: ~1032px (6 × 140 + 5 × 24)
- **Total Height**: ~820px (5 × 140 + 4 × 24)

### Visual Layout

```
┌────────────────────────────────────────────────────────────────┐
│                         TOP BAR (64px)                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   [1]  [2]  [3]  [4]  [5]  [6]   ← Row 1                     │
│                                                                │
│   [7]  [8]  [9]  [10] [11] [12]  ← Row 2                     │
│                                                                │
│   [13] [14] [15] [16] [17] [18]  ← Row 3                     │
│                                                                │
│   [19] [20] [21] [22] [23] [24]  ← Row 4                     │
│                                                                │
│   [25] [26] [27] [28] [29] [30]  ← Row 5                     │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                         DOCK (96px)                            │
└────────────────────────────────────────────────────────────────┘

       ↑       ↑       ↑       ↑       ↑       ↑
     Col 1   Col 2   Col 3   Col 4   Col 5   Col 6
```

---

## Widget Capacity

### Current Implementation
- **Maximum Widgets**: 30
- **Visible at Once**: All 30 (no scrolling needed)
- **Grid Density**: Optimal for 1440px displays

### Space Utilization

| Component | Height | Purpose |
|-----------|--------|---------|
| Top Bar | 64px | Navigation, search, user menu |
| Workspace | ~820px | 30 widget grid (5 rows) |
| Dock | 96px | System apps |
| Padding | 96px | Top + bottom spacing |
| **Total** | **~1076px** | Fits 1080p+ displays |

---

## Grid Behavior

### Empty State
- **Invisible**: Grid cells are transparent (opacity: 0)
- **No visual clutter**: Clean background
- **Welcome message**: Centered, clearly visible

### Hover State
- **Subtle outline**: Dashed border appears on hover
- **Light background**: Semi-transparent white
- **Visual feedback**: Shows where widget can be placed

### Drag State
- **Target highlighting**: Cell glows blue when dragging over
- **Scale animation**: Cell grows slightly (1.03x)
- **Shadow effect**: Multi-layer shadow appears

### Occupied State
- **Widget rendered**: Full opacity, white background
- **Shadow depth**: Professional elevation
- **Hover effect**: Lifts slightly on hover

---

## Widget Size System

### Current: Fixed Size (1×1)
All widgets currently occupy **1 cell** (140×140px)

### Future: Multi-Size Support

| Size | Cells | Dimensions | Grid Span | Use Case |
|------|-------|------------|-----------|----------|
| 1×1 | 1 | 140×140px | 1 col × 1 row | Quick stats, buttons |
| 2×1 | 2 | 304×140px | 2 col × 1 row | Lists, mini charts |
| 1×2 | 2 | 140×304px | 1 col × 2 row | Vertical lists |
| 2×2 | 4 | 304×304px | 2 col × 2 row | Dashboards, charts |
| 3×2 | 6 | 468×304px | 3 col × 2 row | Wide panels |
| 3×3 | 9 | 468×468px | 3 col × 3 row | Large dashboards |

**Note**: Multi-size support planned for Phase 2

---

## Animation Sequence

### Page Load Animation

**Timeline**:
```
0ms    → Page loads
50ms   → Cell 1 fades in
80ms   → Cell 2 fades in
110ms  → Cell 3 fades in
...
920ms  → Cell 30 fades in
1000ms → Dock icon 1 fades in
1350ms → Dock icon 8 fades in (complete)
```

**Stagger Pattern**:
- **Grid cells**: 30ms delay between each
- **Welcome message**: Appears at 300ms
- **Dock icons**: Start at 1000ms, 50ms apart

**Effect**: Smooth cascade animation creating a polished first impression

---

## Responsive Breakpoints

### Desktop (1440px+) ✅ Current
- **Grid**: 6 columns × 5 rows = 30 cells
- **Optimal experience**

### Laptop (1024px - 1439px)
- **Grid**: 5 columns × 5 rows = 25 cells
- **Slightly condensed**

### Tablet (768px - 1023px) ⚠️ Warning Shown
- **Grid**: 3 columns × 6 rows = 18 cells
- **Mobile warning displayed**

### Mobile (<768px) ⚠️ Warning Shown
- **Grid**: 2 columns × 8 rows = 16 cells
- **Strong warning**: Desktop recommended

---

## Grid Placement Algorithm

### Cell Numbering
Cells are numbered **left-to-right, top-to-bottom**:

```
Row 1:  1   2   3   4   5   6
Row 2:  7   8   9  10  11  12
Row 3: 13  14  15  16  17  18
Row 4: 19  20  21  22  23  24
Row 5: 25  26  27  28  29  30
```

### Widget Placement Logic

```javascript
// Drop widget at cell
function placeWidget(widgetData, cellNumber) {
  // 1. Check if cell is empty
  if (!isCellEmpty(cellNumber)) {
    return false; // Can't place
  }

  // 2. Create widget instance
  const widget = createWidget(widgetData, cellNumber);

  // 3. Render in cell
  renderWidget(widget, cellNumber);

  // 4. Mark cell as occupied
  markCellOccupied(cellNumber);

  // 5. Save workspace state
  saveWorkspace();

  return true;
}
```

### Future: Multi-Cell Widgets

```javascript
// Place 2×2 widget starting at cell
function placeMultiCellWidget(widgetData, startCell, size) {
  // Calculate required cells
  const requiredCells = calculateCellSpan(startCell, size);

  // Check if all cells are empty
  if (!areAllCellsEmpty(requiredCells)) {
    return false;
  }

  // Place widget spanning multiple cells
  placeWidget(widgetData, requiredCells);
}
```

---

## Performance Considerations

### Grid Rendering
- **30 cells**: Minimal DOM nodes
- **CSS Grid**: Hardware accelerated
- **Invisible cells**: No rendering overhead

### Animation Performance
- **30 animations**: Staggered over 920ms
- **Transform-based**: GPU accelerated
- **60 FPS**: Smooth on modern browsers

### Memory Usage
- **Empty workspace**: ~50KB (HTML + CSS)
- **30 widgets**: ~500KB (depends on widget content)
- **Total**: <1MB for full workspace

---

## Grid Density Analysis

### Current vs Alternative Layouts

| Layout | Columns | Rows | Total | Width | Height | Density |
|--------|---------|------|-------|-------|--------|---------|
| Current | 6 | 5 | **30** | 1032px | 820px | Optimal ✅ |
| Dense | 8 | 6 | 48 | 1376px | 984px | Too cramped ❌ |
| Sparse | 5 | 4 | 20 | 860px | 656px | Too few ❌ |
| Wide | 7 | 4 | 28 | 1204px | 656px | Unbalanced ❌ |

**Conclusion**: 6×5 grid (30 cells) is the optimal balance for 1440px displays.

---

## Usage Guidelines

### Widget Organization Best Practices

**Top Rows (1-12)**:
- Most frequently used widgets
- Quick-access tools
- Dashboard summaries

**Middle Rows (13-24)**:
- Secondary tools
- Monitoring widgets
- Reference data

**Bottom Row (25-30)**:
- Less frequently accessed
- Administrative tools
- Settings widgets

### Workspace Templates

**Researcher Layout**:
```
[CAS View] [Recent]  [Notes]   [AI Help] [Safety] [Refs]
[Equipment Status────────────] [Inventory Alert─────────]
[Experiment Log──────────────] [Literature Search───────]
[Calendar] [Tasks]  [Alerts]  [Stats]   [Export] [Help]
[Vendor1]  [Vendor2] [Vendor3] [Order]   [Budget] [Admin]
```

**Supervisor Layout**:
```
[Team────] [Progress──────────] [Alerts──────────]
[Maintenance Log──────────────] [Equipment Status]
[Budget──] [Orders────────────] [Approvals───────]
[Reports─] [Analytics─────────] [Compliance──────]
[Admin───] [Settings──────────] [Help────────────]
```

---

## Future Enhancements

### Phase 1 ✅
- [x] 30-cell grid (6×5)
- [x] Invisible empty cells
- [x] Smooth animations
- [x] Drag-and-drop placement

### Phase 2 (Planned)
- [ ] Multi-size widgets (2×1, 2×2, 3×2)
- [ ] Widget resize handles
- [ ] Smart auto-layout
- [ ] Template library

### Phase 3 (Advanced)
- [ ] Custom grid size (user configurable)
- [ ] Widget snapping and alignment
- [ ] Grid density slider
- [ ] Multiple pages/workspaces

---

**Last Updated**: 2025-11-18
**Grid Capacity**: 30 widgets (6 columns × 5 rows)
**Status**: Production Ready
