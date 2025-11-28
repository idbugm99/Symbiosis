# Symbiosis

> Scientific Research and Data Management Platform

**Symbiosis** is a comprehensive, modern platform designed to transform how scientific labs, researchers, and biotech teams interact with their data. It merges inventory tracking, chemical databases, experimental logging, equipment maintenance, vendor sourcing, and AI-assisted insights into a single, intuitive interface.

---

## 🎯 Project Vision

Symbiosis replaces scattered spreadsheets, manual tracking, fragmented vendor lists, and disorganized lab notebooks with a unified dashboard. The system supports:

- **CAS entries** with PubChem-style metadata
- **Lab supplies** and inventory tracking
- **Equipment maintenance** schedules and logs
- **Experimental protocols** and results documentation
- **Vendor management** and ordering
- **AI-assisted** context-aware insights and educational modules

---

## 🚀 Key Features

### 📊 Unified Dashboard
- Interactive, educational, and context-aware interface
- Role-based views for supervisors, researchers, and vendors
- Real-time collaboration and data sharing

### 🧪 Chemical Management
- CAS number database with PubChem integration
- GHS hazard classifications and safety data
- Inventory tracking with location and expiration management
- MSDS document storage and retrieval

### 🔬 Equipment Tracking
- Equipment lifecycle management
- Maintenance scheduling and history
- Usage logs linked to experiments
- Documentation and manual storage

### 📝 Experiment Logging
- Digital lab notebook with rich text support
- Protocol templates and SOP management
- Results documentation with file attachments
- Chemical and equipment usage tracking

### 🤖 AI Integration
- Image caption generation
- Chemical classification assistance
- Literature cross-referencing
- Educational content adaptation (simplified for students, technical for researchers)

### 👥 User Management
- Firebase Authentication integration
- Role-based access control (user, researcher, supervisor, admin)
- Team collaboration features

---

## 🏗️ Architecture

### Frontend
- **Framework**: Vite + Vanilla JavaScript
- **Templating**: Handlebars
- **Styling**: Custom CSS with modern design patterns
- **Authentication**: Firebase Auth

### Backend
- **Runtime**: Node.js with Express
- **Authentication**: Firebase Admin SDK
- **API**: RESTful API with JWT validation
- **Logging**: Winston

### Database
- **Primary**: PostgreSQL (normalized relational structure)
- **Features**: UUID primary keys, JSONB for flexible data, full audit logging

### Infrastructure
- **Hosting**: Firebase Hosting
- **Functions**: Firebase Cloud Functions (optional)
- **Storage**: Firebase Storage (for documents/images)
- **Deployment**: Firebase CLI

---

## 📁 Project Structure

```
Camille/
├── frontend/              # Vite-based frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page templates
│   │   ├── widgets/       # Domain-specific widgets
│   │   ├── utils/         # Helper functions
│   │   └── main.js        # Application entry point
│   ├── public/            # Static assets
│   └── package.json
│
├── backend/               # Express API server
│   ├── app/
│   │   ├── routes/        # API endpoint definitions
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Helper functions
│   ├── server.js          # Server entry point
│   └── package.json
│
├── database/              # Database schema and migrations
│   ├── schema.sql         # Complete database schema
│   ├── migrations/        # Versioned schema changes
│   ├── seeders/           # Test data scripts
│   └── README.md          # Database documentation
│
├── shared/                # Shared code between frontend/backend
│   ├── interfaces/        # TypeScript interfaces (future)
│   ├── constants/         # Shared constants
│   └── utils/             # Shared utilities
│
├── docs/                  # Project documentation
│   ├── architecture/      # System design docs
│   ├── api/               # API documentation
│   ├── database/          # Database documentation
│   └── roadmap/           # Feature roadmap
│
├── infra/                 # Infrastructure configuration
│   ├── docker/            # Docker configurations
│   ├── nginx/             # Nginx configurations
│   └── scripts/           # Deployment scripts
│
├── firebase.json          # Firebase configuration
├── .firebaserc            # Firebase project settings
└── README.md              # This file
```

---

## 🛠️ Setup Instructions

### Prerequisites

- **Node.js**: v18 or higher
- **PostgreSQL**: v14 or higher
- **Firebase Account**: For authentication and hosting
- **Firebase CLI**: `npm install -g firebase-tools`

### 1. Clone and Install

```bash
cd /Users/programmer/Projects/Camille

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Configure Environment Variables

**Frontend** (`frontend/.env`):
```bash
cp frontend/.env.example frontend/.env
# Edit with your Firebase credentials
```

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
# Edit with your Firebase and database credentials
```

### 3. Set Up Database

```bash
# Create database
psql -U postgres
CREATE DATABASE symbiosis;
\c symbiosis

# Run schema
\i database/schema.sql
```

### 4. Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Select:
# - Hosting
# - Functions (optional)
# - Emulators (recommended for development)
```

### 5. Start Development Servers

**Terminal 1 - Frontend**:
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - Backend**:
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 3 - Firebase Emulators** (optional):
```bash
firebase emulators:start
# Emulator UI on http://localhost:4000
```

---

## 🧪 Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests (future)
cd frontend
npm test
```

### Database Migrations

```bash
cd backend
npm run migrate
```

### Seeding Test Data

```bash
cd backend
npm run seed
```

---

## 🚢 Deployment

### Build for Production

```bash
# Build frontend
cd frontend
npm run build

# Output: frontend/dist/
```

### Deploy to Firebase

```bash
# From project root
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions
```

---

## 🔐 Security

- **Authentication**: Firebase Auth with JWT token validation
- **Authorization**: Role-based access control (RBAC)
- **API Security**: Rate limiting, CORS, Helmet middleware
- **Database**: Connection pooling, prepared statements, audit logging
- **Secrets**: Environment variables, never committed to git

---

## 📚 API Documentation

API documentation is available at `/docs/api/README.md`

**Base URL**: `http://localhost:5000/api`

### Key Endpoints

- `GET /health` - Health check
- `POST /api/chemicals` - Create chemical entry
- `GET /api/chemicals/:id` - Get chemical details
- `GET /api/equipment` - List equipment
- `POST /api/experiments` - Create experiment
- `GET /api/users/me` - Get current user profile

See full API docs for complete endpoint reference.

---

## 🗺️ Roadmap

### Phase 1: MVP (Current)
- ✅ Project structure and setup
- ✅ Authentication with Firebase
- ✅ Basic chemical/equipment/experiment CRUD
- ✅ Database schema
- 🔄 UI implementation
- 🔄 Basic dashboard

### Phase 2: Enhanced Features
- [ ] Advanced search and filtering
- [ ] File upload and storage
- [ ] Batch operations
- [ ] Data export (CSV, PDF)
- [ ] Email notifications

### Phase 3: AI Integration
- [ ] Chemical classification assistant
- [ ] Literature cross-referencing
- [ ] Protocol suggestions
- [ ] Educational content adaptation

### Phase 4: Advanced Capabilities
- [ ] Genetic data tracking
- [ ] Cell panel analysis (Eurofins-style)
- [ ] Real-time collaboration
- [ ] Mobile app
- [ ] API integrations (PubChem, etc.)

---

## 👥 Team

**Lead Developer**: Camille's Dad
**Primary User**: Camille (High School Researcher)
**Platform**: Part of the Phoenix4ge Ecosystem

---

## 📄 License

Proprietary - All Rights Reserved

---

## 🤝 Contributing

This is a private project currently in development. Contribution guidelines will be added when the project is opened for collaboration.

---

## 📞 Support

For questions or issues, please contact the development team or file an issue in the project repository.

---

**Built with ❤️ for scientific research and discovery**
