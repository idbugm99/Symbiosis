# Widget Components

Custom widget implementations for the Symbiosis desktop.

## 📁 Structure

```
widgets/
├── EquipmentWidget.ts    ← Equipment search widget (2×1)
├── EquipmentWidget.css   ← Equipment widget styles
└── README.md             ← This file
```

## 🔬 Equipment Widget

**Design:** Based on Figma mockups
**Size:** 2×1 tile (strip)
**Widget ID:** `equipment-search`
**Data:** 688 equipment records from CSV

### Features

✅ **Real-time search** - Filter equipment as you type
✅ **Scrollable list** - Shows Name | Internal ID | Asset ID
✅ **Detail card** - Click item to see details popup
✅ **Copy function** - Copy equipment info to clipboard
✅ **App launcher** - "More" button opens full Equipment app

### Usage

The widget is automatically loaded when you add it to the desktop:

```typescript
// Widget definition (already added to widgets.ts)
{
  id: 'equipment-search',
  name: 'Equipment',
  icon: '🔬',
  component: 'EquipmentWidget',  // ← Loads this widget
  ...
}
```

### Testing

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Add widget to desktop:**
   - Open widget picker
   - Select "Equipment" widget
   - Place on desktop (2×1 space needed)

3. **Test features:**
   - Type in search box (real-time filtering)
   - Click equipment item (shows detail card)
   - Click "Copy" (copies to clipboard)
   - Click "More" (opens Equipment app - not built yet)

### Data Flow

```
User types → searchEquipment(query) → Filter 688 records → Render results
                         ↓
                    (queries.ts)
                         ↓
              (equipment.ts - static data)
```

### Component API

```typescript
class EquipmentWidget {
  constructor(container: HTMLElement)
  refresh(): void              // Refresh data
  destroy(): void              // Cleanup
}
```

---

## 📝 Adding New Widgets

### Step 1: Create Widget Component

Create `YourWidget.ts`:

```typescript
export class YourWidget {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="your-widget">
        <!-- Your widget HTML -->
      </div>
    `;
  }

  public refresh(): void {
    // Reload data
  }

  public destroy(): void {
    // Cleanup
  }
}
```

### Step 2: Create Styles

Create `YourWidget.css`:

```css
.your-widget {
  /* Your styles */
}
```

### Step 3: Register Widget

1. **Add to widgets definition** (`data/definitions/widgets.ts`):

```typescript
{
  id: 'your-widget',
  name: 'Your Widget',
  component: 'YourWidget',  // ← Component name
  ...
}
```

2. **Add to widget loader** (`managers/widget-ui-controller.ts`):

```typescript
case 'YourWidget':
  const { YourWidget } = await import('../widgets/YourWidget.js');
  ComponentClass = YourWidget;
  break;
```

3. **Import CSS** (`desktop.html`):

```html
<link rel="stylesheet" href="/src/widgets/YourWidget.css">
```

### Step 4: Test

```bash
npm run build
npm run dev
```

---

## 🎨 Widget Design Guidelines

### Sizes

- **1×1 (tile):** Icon + minimal data, launcher style
- **2×1 (strip):** Horizontal list, compact data
- **2×2 (card):** Balanced content, stats, charts
- **4×2 (panel):** Wide dashboard, complex data

### Content Hierarchy

1. **Search/filters** (if needed)
2. **Primary content** (scrollable)
3. **Actions** (buttons, links)

### Performance

- **Lazy load** heavy data
- **Virtualize** long lists (100+ items)
- **Debounce** search input (300ms)
- **Cache** data queries

### User Experience

- **Loading states** for async data
- **Empty states** for no results
- **Error handling** with user-friendly messages
- **Hover effects** for interactive elements

---

## 🔧 Data Integration

### Static Data (Current)

```typescript
import { searchEquipment } from '@/data/equipment/queries';
const results = searchEquipment('incubator');
```

### Future: API Data

```typescript
async function searchEquipment(query: string) {
  const response = await fetch(`/api/equipment/search?q=${query}`);
  return response.json();
}
```

Widget code stays the same! Just update query functions.

---

## 📊 Current Widgets

| Widget | ID | Size | Status |
|--------|-----|------|--------|
| Equipment Search | `equipment-search` | 2×1 | ✅ Built |
| CAS Quick View | `cas-quick-view` | 2×1 | ⏳ Pending |
| Favorites | `favorites` | 2×1 | ⏳ Pending |
| Inventory Alerts | `inventory-alerts` | 2×2 | ⏳ Pending |
| Calibration Schedule | `calibration-schedule` | 2×1 | ⏳ Pending |

---

**Last Updated:** 2025-12-27
**Equipment Widget:** Production Ready ✅
