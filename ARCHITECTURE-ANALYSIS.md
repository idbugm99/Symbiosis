# Symbiosis Architecture Analysis
**Date:** December 10, 2025
**Purpose:** Assess current separation vs. planned containerization architecture

---

## Executive Summary

The Symbiosis codebase has a **solid foundation** for the planned architecture with clean frontend/backend separation and domain-separated routes. However, it needs **significant refactoring** to support true microservices containerization.

### Status Overview
- ✅ **Frontend Structure**: 85% compliant
- ⚠️ **Backend Structure**: 40% compliant
- ❌ **Containerization**: 0% complete
- ⚠️ **Widget/App Framework**: 50% complete

---

## 1. Current State Analysis

### ✅ STRENGTHS (Already Separated)

#### 1.1 Directory Structure
```
/backend/               ← Backend isolated
  /app/
    /routes/           ← Domain routes separated
    /middleware/       ← Reusable middleware
    /services/         ← External service integrations
    /utils/            ← Shared utilities
  server.js            ← Single entry point

/frontend/             ← Frontend isolated
  /src/
    /managers/         ← Frontend controllers
    /data/             ← Static definitions
    /components/       ← UI components
    /widgets/          ← Widget components
```

#### 1.2 Backend Route Separation
Routes are already separated by domain:
- `/backend/app/routes/auth.js` → `/api/auth/*`
- `/backend/app/routes/chemicals.js` → `/api/chemicals/*`
- `/backend/app/routes/equipment.js` → `/api/equipment/*`
- `/backend/app/routes/experiments.js` → `/api/experiments/*`
- `/backend/app/routes/users.js` → `/api/users/*`
- `/backend/app/routes/health.js` → `/health`

**This is the RIGHT structure for containerization.**

#### 1.3 Frontend Controllers
Universal controllers exist:
- `widget-manager.js` - Widget CRUD, grid management, positioning ✅
- `workspace-manager.js` - Workspace switching, management ✅
- `dock-manager.js` - Dock UI management ✅
- `storage-manager.js` - LocalStorage abstraction ✅
- `hotkey-manager.js` - Keyboard shortcuts ✅

#### 1.4 Static Configuration Files
- `apps-static.js` - App definitions ✅
- `widgets-only-static.js` - Widget definitions ✅
- Separation of concerns established ✅

---

## 2. Architecture Compliance Issues

### ⚠️ ISSUE #1: Monolithic Backend Server
**Current State:**
`backend/server.js` loads ALL routes into ONE Express server:
```javascript
app.use('/api/auth', authRoutes);
app.use('/api/chemicals', authMiddleware, chemicalsRoutes);
app.use('/api/equipment', authMiddleware, equipmentRoutes);
app.use('/api/experiments', authMiddleware, experimentsRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
```

**Problem:**
This is a **monolithic architecture**. All services run in one process, defeating containerization goals.

**Required Changes:**
1. Create separate service entry points:
   - `/services/auth-service/server.js`
   - `/services/chemicals-service/server.js`
   - `/services/equipment-service/server.js`
   - `/services/experiments-service/server.js`
   - `/services/user-preferences-service/server.js`

2. Each service should:
   - Run independently on different ports
   - Have its own Express server
   - Be containerized separately
   - Scale independently

**Severity:** 🔴 CRITICAL for containerization

---

### ⚠️ ISSUE #2: Missing Service Layer
**Current State:**
Routes directly contain business logic with TODOs:
```javascript
router.get('/', async (req, res, next) => {
  // TODO: Implement database query
  const chemicals = [];
  res.json({ success: true, data: chemicals });
});
```

**Problem:**
No separation between HTTP layer and business logic. Cannot reuse logic across services.

**Required Changes:**
1. Create service classes for each domain:
   ```
   /backend/app/services/
     ChemicalsService.js      ← CAS data, vendors, pricing
     EquipmentService.js      ← Instruments, calibration
     ExperimentsService.js    ← Experiment CRUD
     AuthService.js           ← Authentication logic
     UserPreferencesService.js ← User settings
   ```

2. Routes should delegate to services:
   ```javascript
   router.get('/', async (req, res, next) => {
     const chemicals = await ChemicalsService.getAll(req.query);
     res.json({ success: true, data: chemicals });
   });
   ```

**Severity:** 🟡 HIGH for maintainability and testing

---

### ⚠️ ISSUE #3: No Containerization Setup
**Current State:**
Zero Docker configuration files exist.

**Required Changes:**
1. Create Dockerfiles for each service:
   ```
   /infra/docker/
     auth-service.Dockerfile
     chemicals-service.Dockerfile
     equipment-service.Dockerfile
     ...
   ```

2. Create `docker-compose.yml` for local development:
   ```yaml
   services:
     auth-service:
       build: ./infra/docker/auth-service.Dockerfile
       ports: ["3001:3001"]
       environment:
         - DB_HOST=postgres

     chemicals-service:
       build: ./infra/docker/chemicals-service.Dockerfile
       ports: ["3002:3002"]
       environment:
         - DB_HOST=postgres

     postgres:
       image: postgres:15
       environment:
         - POSTGRES_DB=symbiosis
   ```

3. Create Kubernetes manifests (optional for production):
   ```
   /infra/k8s/
     auth-deployment.yaml
     chemicals-deployment.yaml
     equipment-deployment.yaml
   ```

**Severity:** 🔴 CRITICAL for containerization

---

### ⚠️ ISSUE #4: App Instance Settings Not Implemented
**Current State:**
`apps-static.js` only defines basic metadata:
```javascript
{
  id: 'chemicals-app',
  name: 'Chemicals',
  icon: '🧪',
  opensPage: '/pages/chemicals.html'  // Wrong approach
}
```

**Problem:**
- Missing `displayMode`, `animation`, `multiInstance` settings
- Using `opensPage` instead of app launch framework
- No widget override mechanism

**Required Changes:**
1. Enhance `apps-static.js` with instance settings:
   ```javascript
   {
     id: 'chemicals-app',
     name: 'Chemicals',
     icon: '🧪',
     type: 'app',
     // DEFAULT INSTANCE SETTINGS:
     displayMode: 'fullscreen-no-nav',
     animation: 'slide-right',
     dock: false,
     menuBar: false,
     multiInstance: false,
     // App rendering:
     component: 'ChemicalsApp',  // React/Vue component
     apiEndpoint: '/api/chemicals'
   }
   ```

2. Enhance `widgets-only-static.js` with launch settings:
   ```javascript
   {
     id: 'cas-quick-view',
     name: 'CAS Quick View',
     controlledBy: 'chemicals-app',
     // WIDGET LAUNCH SETTINGS:
     launchesApp: 'chemicals-app',
     launchTrigger: 'doubleClick',
     instanceSettingsOverride: {
       displayMode: 'popup',
       dimensions: { width: 800, height: 600 },
       position: 'center',
       animation: 'expand-from-widget'
     }
   }
   ```

**Severity:** 🟡 HIGH for UX consistency

---

### ⚠️ ISSUE #5: Missing App UI Controller
**Current State:**
`workspace-manager.js` manages workspaces but doesn't handle app windows.

**Problem:**
No centralized app window management. No display mode handling.

**Required Changes:**
1. Create `/frontend/src/managers/app-ui-controller.js`:
   ```javascript
   export class AppUIController {
     constructor() {
       this.openApps = new Map();  // Track open app windows
       this.zIndexCounter = 1000;
     }

     openApp(appId, instanceSettings, sourceWidget = null) {
       // 1. Create window container based on displayMode
       // 2. Apply animation (slide, fade, expand-from-widget)
       // 3. Handle chrome (title bar, borders, shadows)
       // 4. Manage global UI (hide dock/nav if needed)
       // 5. Render app content inside container
       // 6. Track instance in this.openApps
     }

     closeApp(instanceId) { /* ... */ }
     minimizeApp(instanceId) { /* ... */ }
     maximizeApp(instanceId) { /* ... */ }
     bringToFront(instanceId) { /* ... */ }
   }
   ```

2. Integrate with existing managers:
   ```javascript
   // In desktop.js or main.js:
   const appUIController = new AppUIController();
   const widgetManager = new WidgetManager({
     onWidgetDoubleClick: (widget) => {
       if (widget.launchesApp) {
         appUIController.openApp(
           widget.launchesApp,
           widget.instanceSettingsOverride,
           widget
         );
       }
     }
   });
   ```

**Severity:** 🟡 HIGH for UX framework

---

### ⚠️ ISSUE #6: Widget → App Launch Not Implemented
**Current State:**
`widget-manager.js` handles widget CRUD but no app launch logic.

**Required Changes:**
1. Add launch event handling in `widget-manager.js`:
   ```javascript
   renderWidget(widget) {
     // Existing rendering code...

     // NEW: Add launch event handlers
     if (widget.launchesApp) {
       const trigger = widget.launchTrigger || 'doubleClick';

       if (trigger === 'doubleClick') {
         widgetElement.addEventListener('dblclick', () => {
           this.launchAppFromWidget(widget);
         });
       } else if (trigger === 'click') {
         widgetElement.addEventListener('click', () => {
           this.launchAppFromWidget(widget);
         });
       }
     }
   }

   launchAppFromWidget(widget) {
     const appDef = this.getAppDefinition(widget.launchesApp);
     const settings = {
       ...appDef.defaultInstanceSettings,
       ...widget.instanceSettingsOverride,
       sourceWidgetPosition: this.getWidgetPosition(widget)
     };

     this.appUIController.openApp(widget.launchesApp, settings, widget);
   }
   ```

**Severity:** 🟡 MEDIUM for widget interaction

---

## 3. Containerization Readiness Assessment

### Ready for Containerization ✅
- [x] Route separation by domain
- [x] Environment variable configuration
- [x] Middleware architecture
- [x] Error handling middleware
- [x] Request logging middleware

### NOT Ready for Containerization ❌
- [ ] Separate service entry points (one per container)
- [ ] Service layer abstraction
- [ ] Database connection per service
- [ ] Dockerfiles for each service
- [ ] docker-compose.yml for orchestration
- [ ] Health check endpoints per service
- [ ] Service discovery mechanism
- [ ] API gateway / reverse proxy configuration

---

## 4. Recommended Refactoring Plan

### Phase 1: Service Layer (1-2 weeks)
**Goal:** Extract business logic from routes into service classes

1. Create service classes:
   - `ChemicalsService.js`
   - `EquipmentService.js`
   - `ExperimentsService.js`
   - `AuthService.js`
   - `UserPreferencesService.js`

2. Refactor routes to delegate to services

3. Add unit tests for services

**Blocker:** None (can start immediately)

---

### Phase 2: Microservices Separation (2-3 weeks)
**Goal:** Split monolithic server into separate service processes

1. Create separate service directories:
   ```
   /services/
     auth-service/
       server.js
       routes/auth.js
       services/AuthService.js
       package.json
     chemicals-service/
       server.js
       routes/chemicals.js
       services/ChemicalsService.js
       package.json
     ...
   ```

2. Each service should:
   - Run on its own port (3001, 3002, 3003, ...)
   - Have its own package.json
   - Be independently runnable
   - Have its own health check endpoint

3. Create API Gateway or use Nginx to route:
   ```
   /api/auth/* → localhost:3001
   /api/chemicals/* → localhost:3002
   /api/equipment/* → localhost:3003
   ```

**Blocker:** Requires Phase 1 completion

---

### Phase 3: Database Separation (1-2 weeks)
**Goal:** Separate database schemas per bounded context

1. Create separate schemas:
   - `symbiosis_auth` - users, sessions, tokens
   - `symbiosis_chemicals` - CAS data, vendors, inventory
   - `symbiosis_equipment` - instruments, calibration
   - `symbiosis_experiments` - experiment data

2. Each service connects to its own schema

3. Implement data synchronization if needed (e.g., user data)

**Blocker:** Requires Phase 2 completion

---

### Phase 4: Containerization (1-2 weeks)
**Goal:** Dockerize all services for deployment

1. Create Dockerfiles for each service

2. Create `docker-compose.yml` for local development

3. Test full stack in containers

4. Create production orchestration (Kubernetes manifests or ECS config)

**Blocker:** Requires Phase 2 completion (Phase 3 can run in parallel)

---

### Phase 5: Frontend App Framework (2-3 weeks)
**Goal:** Implement app instance settings and launch framework

1. Create `AppUIController` class

2. Enhance `apps-static.js` and `widgets-only-static.js` with settings

3. Implement widget → app launch flow

4. Add display modes (fullscreen, popup, modal, etc.)

5. Add animations (slide, fade, expand-from-widget)

**Blocker:** None (can run in parallel with Phase 1-4)

---

## 5. Critical Path for Dockerization

To achieve **"one service per container"** architecture, you must complete:

```
Phase 1 (Service Layer)
    ↓
Phase 2 (Microservices Separation)
    ↓
Phase 4 (Containerization)
```

**Estimated Timeline:** 5-8 weeks for full containerization

**Quick Win Option (2-3 weeks):**
If you need to dockerize NOW without full microservices:
1. Create a single Dockerfile for current monolithic backend
2. Create a Dockerfile for frontend (Nginx serving static files)
3. Create a docker-compose.yml with:
   - Backend container (monolithic)
   - Frontend container
   - Database container
   - Nginx gateway

This gives you containerization benefits (isolation, reproducibility) but NOT the scalability/fault-isolation benefits of microservices.

---

## 6. Current vs. Target Architecture

### Current Architecture (Monolithic)
```
┌─────────────────────────────────────┐
│         Frontend (Browser)          │
│   - widget-manager.js               │
│   - workspace-manager.js            │
│   - dock-manager.js                 │
└───────────┬─────────────────────────┘
            │ HTTP Requests
            ↓
┌─────────────────────────────────────┐
│      Backend (Single Process)       │
│  ┌───────────────────────────────┐  │
│  │ Express Server (server.js)    │  │
│  │  - /api/auth/*                │  │
│  │  - /api/chemicals/*           │  │
│  │  - /api/equipment/*           │  │
│  │  - /api/experiments/*         │  │
│  │  - /api/users/*               │  │
│  └───────────────────────────────┘  │
└───────────┬─────────────────────────┘
            │ Database Queries
            ↓
┌─────────────────────────────────────┐
│    Database (Single Instance)       │
└─────────────────────────────────────┘
```

**Issues:**
- ❌ All routes in one process
- ❌ Single point of failure
- ❌ Cannot scale services independently
- ❌ Resource contention (all services share RAM/CPU)

---

### Target Architecture (Microservices)
```
┌─────────────────────────────────────┐
│         Frontend (Browser)          │
│   - widget-manager.js               │
│   - app-ui-controller.js   ← NEW!   │
│   - workspace-manager.js            │
└───────────┬─────────────────────────┘
            │ HTTP Requests
            ↓
┌─────────────────────────────────────┐
│    API Gateway / Nginx Proxy        │
│  Routes requests to services        │
└───────────┬─────────────────────────┘
            │
     ┌──────┴──────┬──────────┬────────┬────────┐
     │             │          │        │        │
     ↓             ↓          ↓        ↓        ↓
┌─────────┐  ┌──────────┐ ┌────────┐ ┌────────┐ ┌─────────┐
│  Auth   │  │Chemicals │ │Equip.  │ │Experim.│ │  Users  │
│ Service │  │ Service  │ │Service │ │Service │ │ Service │
│:3001    │  │:3002     │ │:3003   │ │:3004   │ │:3005    │
│         │  │          │ │        │ │        │ │         │
│Container│  │Container │ │Container││Container││Container│
└────┬────┘  └────┬─────┘ └───┬────┘ └───┬────┘ └────┬────┘
     │            │            │          │           │
     └────────────┴────────────┴──────────┴───────────┘
                            │
                            ↓
            ┌───────────────────────────┐
            │ Database Cluster          │
            │  - auth schema            │
            │  - chemicals schema       │
            │  - equipment schema       │
            │  - experiments schema     │
            └───────────────────────────┘
```

**Benefits:**
- ✅ Services in separate processes/containers
- ✅ Independent scaling (scale chemicals-service ↑ without affecting others)
- ✅ Fault isolation (chemicals crash ≠ auth crash)
- ✅ Resource allocation per service
- ✅ Independent deployment cycles

---

## 7. Immediate Action Items

### To Prepare for Dockerization:

1. **Create Service Layer (Priority: CRITICAL)**
   - Extract business logic from routes
   - Create reusable service classes
   - Add error handling and validation

2. **Split Backend into Microservices (Priority: CRITICAL)**
   - Create separate service directories
   - Move routes + services to respective service folders
   - Configure separate ports per service

3. **Setup Docker Infrastructure (Priority: HIGH)**
   - Write Dockerfiles for each service
   - Create docker-compose.yml for local dev
   - Test full stack in containers

4. **Implement App UI Controller (Priority: MEDIUM)**
   - Build centralized app window management
   - Add display modes and animations
   - Wire up widget → app launch flow

5. **Enhance Static Definitions (Priority: MEDIUM)**
   - Add instance settings to apps-static.js
   - Add launch settings to widgets-only-static.js
   - Document override mechanisms

---

## 8. Conclusion

**Current State:** Symbiosis has a GOOD architectural foundation but is currently a **monolithic application** masquerading as microservices.

**Path Forward:** 5-8 weeks of focused refactoring to achieve true microservices architecture with containerization.

**Quick Win Option:** 2-3 weeks to containerize as-is (monolithic) for basic Docker benefits.

**Recommendation:** Proceed with **Phase 1 (Service Layer)** immediately. This provides immediate code quality benefits and is required for all future phases.

---

## Appendix A: File Structure After Refactoring

```
/Symbiosis/

  /services/                    ← NEW! Microservices
    /auth-service/
      server.js
      /routes/
        auth.js
      /services/
        AuthService.js
      /middleware/
      package.json
      Dockerfile

    /chemicals-service/
      server.js
      /routes/
        chemicals.js
      /services/
        ChemicalsService.js
      package.json
      Dockerfile

    /equipment-service/
      server.js
      /routes/
        equipment.js
      /services/
        EquipmentService.js
      package.json
      Dockerfile

    /experiments-service/
      server.js
      /routes/
        experiments.js
      /services/
        ExperimentsService.js
      package.json
      Dockerfile

    /user-preferences-service/
      server.js
      /routes/
        users.js
      /services/
        UserPreferencesService.js
      package.json
      Dockerfile

  /frontend/
    /src/
      /managers/
        widget-manager.js          ← Enhanced with launch logic
        app-ui-controller.js       ← NEW! App window management
        workspace-manager.js
        dock-manager.js
        storage-manager.js
      /data/
        apps-static.js             ← Enhanced with instance settings
        widgets-only-static.js     ← Enhanced with launch settings

  /infra/
    /docker/
      auth-service.Dockerfile
      chemicals-service.Dockerfile
      equipment-service.Dockerfile
      experiments-service.Dockerfile
      user-preferences-service.Dockerfile
      frontend.Dockerfile
    /nginx/
      nginx.conf                   ← API Gateway routing
    docker-compose.yml             ← Orchestration for local dev

  /database/
    /migrations/
    /seeds/

  /shared/                         ← Shared utilities (if needed)
    /utils/
    /types/

```

---

## Appendix B: Service Port Assignments

| Service | Port | Container Name | Purpose |
|---------|------|----------------|---------|
| Frontend | 3000 | symbiosis-frontend | Nginx serving static files |
| Auth Service | 3001 | symbiosis-auth | Authentication, sessions, tokens |
| Chemicals Service | 3002 | symbiosis-chemicals | CAS data, vendors, inventory |
| Equipment Service | 3003 | symbiosis-equipment | Instruments, calibration |
| Experiments Service | 3004 | symbiosis-experiments | Experiment CRUD |
| User Preferences | 3005 | symbiosis-users | User settings, layouts |
| Nginx Gateway | 80 | symbiosis-gateway | Routes to backend services |
| PostgreSQL | 5432 | symbiosis-db | Database cluster |

---

**END OF ANALYSIS**
