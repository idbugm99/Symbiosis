# Symbiosis Architecture - Quick Reference

## Directory Structure

```
/Symbiosis/
  /backend/
    /app/
      /routes/           ← HTTP endpoints (thin layer)
        auth.js
        chemicals.js     ← Delegates to ChemicalsService
        equipment.js     ← Delegates to EquipmentService
        experiments.js   ← Delegates to ExperimentsService
        users.js
        health.js

      /services/         ← Business logic (NEW!)
        ChemicalsService.js      ← CAS data, inventory, alerts
        EquipmentService.js      ← Instruments, calibration
        ExperimentsService.js    ← Experiment CRUD
        UserPreferencesService.js ← Settings, workspaces, widgets

      /middleware/       ← Express middleware
      /utils/            ← Shared utilities

    server.js            ← Single Express server (modular monolith)

  /frontend/
    /src/
      /managers/         ← Frontend controllers
        app-ui-controller.js      ← NEW! App window management
        widget-ui-controller.js   ← NEW! Widget UI behavior
        widget-manager.js         ← Widget CRUD/data
        workspace-manager.js      ← Workspace management
        dock-manager.js
        storage-manager.js

      /data/             ← Static definitions
        apps-static.js            ← App definitions + instance settings
        widgets-only-static.js    ← Widget definitions + launch settings

      /styles/           ← CSS
        app-windows.css           ← NEW! App window styles
        widgets.css               ← NEW! Widget styles
```

---

## Backend API Patterns

### Routes → Services Pattern
```javascript
// routes/chemicals.js (HTTP layer)
router.get('/', async (req, res, next) => {
  const result = await ChemicalsService.getAll(req.query);
  res.json({ success: true, ...result });
});

// services/ChemicalsService.js (Business logic)
async getAll(options) {
  const { search, category, limit, offset } = options;
  // TODO: const chemicals = await this.db.query(...)
  return { data: chemicals, pagination: {...} };
}
```

### Widget API Endpoints
```javascript
// Widget-specific endpoints in routes
GET /api/chemicals/widget/recent       → Recent chemicals for widget
GET /api/chemicals/widget/favorites    → Favorites for widget
GET /api/chemicals/widget/alerts       → Inventory alerts for widget

GET /api/equipment/widget/calibration  → Calibration schedule
GET /api/equipment/widget/status       → Equipment status monitor
```

---

## Frontend Architecture

### App Window Management
```javascript
import { AppUIController } from './managers/app-ui-controller.js';

const appUIController = new AppUIController();

// Open app from dock/menu (uses default settings from apps-static.js)
appUIController.openApp('chemicals-app');

// Open app from widget (uses widget's instanceSettingsOverride)
appUIController.openApp('chemicals-app', {
  displayMode: 'popup',
  dimensions: { width: 900, height: 700 },
  animation: 'expand-from-widget'
}, widgetElement);
```

### Widget Launch Integration
```javascript
import { WidgetUIController } from './managers/widget-ui-controller.js';

const widgetUIController = new WidgetUIController({
  appUIController: appUIController
});

// Render widget (automatically sets up launch handlers)
widgetUIController.renderWidget(widgetInstance, widgetDefinition);

// Widget definition includes launch settings:
// launchesApp: 'chemicals-app'
// launchTrigger: 'doubleClick'
// instanceSettingsOverride: { displayMode: 'popup', ... }
```

---

## Display Modes Reference

| Mode | Description | Use Case |
|------|-------------|----------|
| `fullscreen` | Full viewport, no UI | Immersive apps (genetics viewer) |
| `fullscreen-no-nav` | Full viewport, top nav hidden | Main apps (chemicals, equipment) |
| `fullscreen-no-dock` | Full viewport, dock hidden | Presentation mode |
| `popup` | Floating window with chrome | Quick access tools, lists |
| `modal` | Centered with backdrop | Dialogs, confirmations |
| `embedded` | Inline, no chrome | Dashboard panels |

---

## Animation Types

| Animation | Effect | Use Case |
|-----------|--------|----------|
| `fade` | Fade in | Subtle, professional |
| `slide-right` | Slide from left | Navigation forward |
| `slide-left` | Slide from right | Navigation back |
| `expand-from-widget` | Grow from widget | Widget launches |

---

## App Instance Settings

### apps-static.js Structure
```javascript
{
  id: 'chemicals-app',
  name: 'Chemicals',
  icon: '🧪',

  // Default settings (dock/menu launch)
  displayMode: 'fullscreen-no-nav',
  animation: 'slide-right',
  multiInstance: false,      // Only one instance allowed
  showCloseButton: true,
  showMinimizeButton: true,
  dock: false,               // Hide dock when open
  menuBar: true,             // Keep menu bar
  sideNav: false,            // Hide side nav

  // Backend integration
  apiEndpoint: '/api/chemicals',
  component: 'ChemicalsApp'
}
```

---

## Widget Launch Settings

### widgets-only-static.js Structure
```javascript
{
  id: 'cas-quick-view',
  name: 'CAS Quick View',
  icon: '🧪',
  controlledBy: 'chemicals-app',

  // Launch settings
  launchesApp: 'chemicals-app',
  launchTrigger: 'doubleClick',  // or 'click', 'longPress'
  instanceSettingsOverride: {
    displayMode: 'popup',
    dimensions: { width: 900, height: 700 },
    position: 'center',
    animation: 'expand-from-widget'
  }
}
```

---

## Service Layer Patterns

### Service Class Template
```javascript
export class MyService {
  constructor(dbConnection = null) {
    this.db = dbConnection;
    this.dataSource = 'static';
  }

  async getAll(options) {
    // TODO: Replace with database query
    // const items = await this.db.query('SELECT ...');
    return { data: items, pagination: {...} };
  }

  async getById(id) {
    // TODO: Replace with database query
    // const item = await this.db.query('SELECT * WHERE id = ?', [id]);
    return item;
  }

  async create(data, userId) {
    // Validation
    if (!data.name) throw new Error('Name required');

    // TODO: Replace with database insert
    const newItem = { id: `item-${Date.now()}`, ...data };
    return newItem;
  }
}

export default new MyService();
```

---

## Integration Checklist

### To Wire Up Controllers:

**1. In desktop.js or main.js:**
```javascript
import { AppUIController } from './managers/app-ui-controller.js';
import { WidgetUIController } from './managers/widget-ui-controller.js';
import { WidgetManager } from './managers/widget-manager.js';

// Initialize controllers
const appUIController = new AppUIController({
  containerElement: document.body,
  onAppOpened: (instanceId, appId) => console.log('App opened:', appId),
  onAppClosed: (instanceId, appId) => console.log('App closed:', appId)
});

const widgetManager = new WidgetManager({
  storageManager: storageManager
});

const widgetUIController = new WidgetUIController({
  appUIController: appUIController,
  widgetManager: widgetManager,
  gridContainer: document.getElementById('widget-grid')
});

// Render widgets
widgetManager.getWidgets().forEach(widget => {
  const definition = getWidgetDefinition(widget.widgetDefId);
  widgetUIController.renderWidget(widget, definition);
});
```

**2. Load CSS:**
```html
<link rel="stylesheet" href="/src/styles/app-windows.css">
<link rel="stylesheet" href="/src/styles/widgets.css">
```

---

## Common Patterns

### Open App from Dock
```javascript
// Dock button click
dockIcon.addEventListener('click', () => {
  appUIController.openApp('chemicals-app'); // Uses default settings
});
```

### Widget Double-Click Launch
```javascript
// Automatically handled by WidgetUIController if widget has:
// launchesApp: 'chemicals-app'
// launchTrigger: 'doubleClick'
```

### Close All Instances of App
```javascript
appUIController.closeAppsByDefinitionId('chemicals-app');
```

### Update Widget Content
```javascript
widgetUIController.updateWidgetContent('widget-123',
  '<div>New content here</div>'
);
```

### Show Widget Loading State
```javascript
widgetUIController.showLoading('widget-123');
// ... fetch data ...
widgetUIController.updateWidgetContent('widget-123', data);
```

---

## Database Integration (Future)

### When Ready to Add Database:

**1. Install database library:**
```bash
npm install pg  # PostgreSQL
# or
npm install mysql2  # MySQL
```

**2. Create database connection:**
```javascript
// backend/app/utils/database.js
import pg from 'pg';

export const pool = new pg.Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
```

**3. Update service:**
```javascript
// services/ChemicalsService.js
import { pool } from '../utils/database.js';

export class ChemicalsService {
  constructor() {
    this.db = pool;
  }

  async getAll(options) {
    const { limit, offset } = options;
    const result = await this.db.query(
      'SELECT * FROM chemicals LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return { data: result.rows, pagination: {...} };
  }
}
```

**Routes don't change! Only service internals change.**

---

## Containerization (Future)

### When Ready to Dockerize:

**1. Create Dockerfile for backend:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./
EXPOSE 5000
CMD ["node", "server.js"]
```

**2. Create docker-compose.yml:**
```yaml
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DB_HOST=postgres
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:80"

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=symbiosis
```

---

## Quick Command Reference

### Backend:
```bash
cd backend
npm install
npm start        # Start backend server (port 5000)
npm test         # Run tests
```

### Frontend:
```bash
cd frontend
npm install
npm run dev      # Start dev server (port 3000)
npm run build    # Build for production
```

---

**END OF QUICK REFERENCE**
