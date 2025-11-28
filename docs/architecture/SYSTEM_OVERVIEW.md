# Symbiosis - System Architecture Overview

## Executive Summary

Symbiosis is a modern, scalable scientific research platform built on a three-tier architecture with Firebase integration for authentication and hosting. The system follows RESTful API design principles with a clear separation of concerns between presentation, business logic, and data layers.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Browser   │  │   Mobile   │  │  Desktop   │            │
│  │  (Vite)    │  │   (Future) │  │  (Future)  │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │                │               │                    │
│        └────────────────┴───────────────┘                    │
│                         │                                     │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                 ┌────────▼────────┐
                 │ Firebase Hosting │
                 └────────┬────────┘
                          │
┌─────────────────────────┼─────────────────────────────────────┐
│                         │  API GATEWAY                         │
│                 ┌───────▼────────┐                            │
│                 │   Express.js   │                            │
│                 │                │                            │
│  ┌──────────────┴───────────────┬────────────────┐          │
│  │                               │                │          │
│  │  ┌─────────────────┐  ┌──────▼──────┐  ┌─────▼──────┐  │
│  │  │  Rate Limiting  │  │    CORS     │  │  Helmet    │  │
│  │  └─────────────────┘  └─────────────┘  └────────────┘  │
│  │                                                          │
│  │  ┌─────────────────────────────────────────────────┐   │
│  │  │         Firebase Auth Middleware                 │   │
│  │  └──────────────────┬──────────────────────────────┘   │
│  │                     │                                    │
└──┼─────────────────────┼────────────────────────────────────┘
   │                     │
┌──┼─────────────────────┼────────────────────────────────────┐
│  │  BUSINESS LOGIC LAYER│                                    │
│  │                     │                                    │
│  │  ┌──────────────────▼───────────────────────┐          │
│  │  │              Routes                       │          │
│  │  │  /chemicals  /equipment  /experiments    │          │
│  │  └──────────────────┬───────────────────────┘          │
│  │                     │                                    │
│  │  ┌──────────────────▼───────────────────────┐          │
│  │  │           Controllers                     │          │
│  │  │  (Request validation & response)          │          │
│  │  └──────────────────┬───────────────────────┘          │
│  │                     │                                    │
│  │  ┌──────────────────▼───────────────────────┐          │
│  │  │             Services                      │          │
│  │  │  (Business logic & data operations)       │          │
│  │  └──────────────────┬───────────────────────┘          │
│  │                     │                                    │
└──┼─────────────────────┼────────────────────────────────────┘
   │                     │
┌──┼─────────────────────┼────────────────────────────────────┐
│  │    DATA LAYER       │                                    │
│  │                     │                                    │
│  │  ┌──────────────────▼───────────────────────┐          │
│  │  │              Models                       │          │
│  │  │  (Database query builders)                │          │
│  │  └──────────────────┬───────────────────────┘          │
│  │                     │                                    │
│  │         ┌───────────┴───────────┐                       │
│  │         │                       │                       │
│  │  ┌──────▼────────┐      ┌──────▼────────┐             │
│  │  │  PostgreSQL   │      │    Firebase   │             │
│  │  │  (Primary DB) │      │  (Auth/Files) │             │
│  │  └───────────────┘      └───────────────┘             │
│  │                                                         │
└──┼─────────────────────────────────────────────────────────┘
   │
┌──┼─────────────────────────────────────────────────────────┐
│  │  EXTERNAL SERVICES                                       │
│  │                                                          │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐          │
│  │  │ PubChem   │  │    AI     │  │   Email   │          │
│  │  │    API    │  │  Services │  │  Service  │          │
│  │  └───────────┘  └───────────┘  └───────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Overview

### 1. Client Layer

**Technology**: Vite + Handlebars + Vanilla JavaScript

**Responsibilities**:
- User interface rendering
- Form validation and user input
- Client-side state management
- API communication via fetch/axios
- Firebase Auth SDK integration

**Key Features**:
- Single Page Application (SPA) architecture
- Handlebars templating for component reusability
- Responsive design for desktop and mobile
- Real-time authentication state management

---

### 2. API Gateway (Express.js)

**Technology**: Node.js + Express.js

**Responsibilities**:
- HTTP request routing
- Request/response formatting
- Security middleware (CORS, Helmet, Rate Limiting)
- Authentication token verification
- Error handling and logging

**Middleware Stack**:
1. **Helmet**: Security headers
2. **CORS**: Cross-origin resource sharing
3. **Rate Limiting**: API abuse prevention
4. **Body Parser**: JSON/URL-encoded parsing
5. **Compression**: Response compression
6. **Request Logger**: Winston-based logging
7. **Auth Middleware**: Firebase token verification

---

### 3. Business Logic Layer

#### Routes (`app/routes/`)
- Define API endpoints
- Map HTTP methods to controllers
- Apply route-specific middleware (e.g., role authorization)

#### Controllers (`app/controllers/`)
- Handle incoming requests
- Validate request data (with Joi schemas)
- Call appropriate service methods
- Format responses

#### Services (`app/services/`)
- Implement business logic
- Coordinate between multiple models
- Handle complex operations (e.g., experiment creation with chemicals)
- External API integration

#### Middleware (`app/middleware/`)
- **auth.js**: Firebase token verification and role-based access
- **errorHandler.js**: Global error handling with custom error classes
- **requestLogger.js**: HTTP request/response logging

---

### 4. Data Layer

#### Models (`app/models/`)
- Database query builders
- Data validation
- Relationship management
- CRUD operations

#### Database (PostgreSQL)
- Primary data store
- Normalized relational schema
- UUID primary keys
- JSONB for flexible data
- Audit logging
- Automatic timestamps

#### Firebase
- **Authentication**: User identity management
- **Storage**: Document and image storage (future)
- **Analytics**: Usage tracking (future)

---

## Data Flow

### Typical Request Flow

```
1. User submits form in browser
   ↓
2. Frontend validates input locally
   ↓
3. Frontend calls API with Firebase ID token
   ↓
4. Express receives request
   ↓
5. Security middleware (CORS, Helmet, Rate Limit)
   ↓
6. Auth middleware verifies Firebase token
   ↓
7. Route handler receives authenticated request
   ↓
8. Controller validates request body (Joi)
   ↓
9. Service implements business logic
   ↓
10. Model executes database queries
    ↓
11. Database returns results
    ↓
12. Service processes and returns data
    ↓
13. Controller formats response
    ↓
14. Response sent to client
    ↓
15. Frontend updates UI
```

---

## Authentication & Authorization

### Firebase Authentication

**Flow**:
1. User logs in via Firebase Auth SDK (frontend)
2. Firebase returns ID token
3. Frontend includes token in API requests (`Authorization: Bearer <token>`)
4. Backend verifies token with Firebase Admin SDK
5. User info attached to `req.user` object

### Role-Based Access Control

**Roles**:
- **user**: Basic read access
- **researcher**: Create/edit experiments, view chemicals/equipment
- **supervisor**: Full experiment/equipment management
- **admin**: Full system access, user management

**Implementation**:
```javascript
// In Firebase custom claims
{ role: 'researcher' }

// In Express middleware
authorize(['admin', 'supervisor'])
```

---

## Security Architecture

### API Security

1. **HTTPS Only**: All production traffic encrypted
2. **CORS**: Whitelist frontend origin
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **Helmet**: Security headers (XSS, clickjacking, etc.)
5. **Input Validation**: Joi schemas for all endpoints
6. **SQL Injection Prevention**: Parameterized queries
7. **Token Validation**: Firebase Admin SDK verification

### Database Security

1. **Least Privilege**: Application user has minimal permissions
2. **Connection Pooling**: Prevent connection exhaustion
3. **Audit Logging**: All changes tracked with user/timestamp
4. **SSL Connections**: Encrypted database connections in production

### Secrets Management

- **Environment Variables**: `.env` files (gitignored)
- **Firebase Service Account**: Separate file, never committed
- **Production**: Environment variables via hosting platform

---

## Scalability Considerations

### Horizontal Scaling

- **Stateless API**: No session storage in memory
- **Load Balancer Ready**: Express instances can be replicated
- **Database Connection Pooling**: Efficient connection management

### Performance Optimization

1. **Caching**: Redis for frequently accessed data (future)
2. **Database Indexes**: All foreign keys and query fields indexed
3. **Query Optimization**: EXPLAIN ANALYZE for slow queries
4. **CDN**: Static assets served via Firebase Hosting CDN
5. **Compression**: Gzip/Brotli response compression

### Data Partitioning (Future)

- **Table Partitioning**: By date for large tables (experiments, audit_log)
- **Read Replicas**: For analytics and reporting
- **Archive Strategy**: Move old data to cold storage

---

## Monitoring & Observability

### Logging

- **Winston**: Structured JSON logging
- **Levels**: debug, info, warn, error
- **Destinations**: Console (dev), Files (prod), External service (future)

### Metrics (Future)

- Request count and latency
- Error rates by endpoint
- Database query performance
- Firebase Auth usage

### Health Checks

- `GET /health`: Basic health check
- `GET /health/detailed`: Includes dependency status

---

## Deployment Architecture

### Development

```
Frontend:  http://localhost:3000 (Vite dev server)
Backend:   http://localhost:5000 (nodemon)
Database:  localhost:5432 (PostgreSQL)
Firebase:  Emulators (port 4000)
```

### Production

```
Frontend:  Firebase Hosting (CDN)
Backend:   Cloud hosting (e.g., Firebase Functions, AWS, DigitalOcean)
Database:  Managed PostgreSQL (e.g., AWS RDS, DigitalOcean)
Firebase:  Production project
```

---

## Technology Stack Summary

| Layer          | Technology           | Purpose                          |
|----------------|----------------------|----------------------------------|
| Frontend       | Vite, Handlebars     | UI rendering and templating      |
| API Gateway    | Express.js           | HTTP routing and middleware      |
| Authentication | Firebase Auth        | User identity management         |
| Database       | PostgreSQL           | Primary data store               |
| ORM/Query      | Native SQL           | Database queries (pg library)    |
| Validation     | Joi                  | Request/response validation      |
| Logging        | Winston              | Application logging              |
| Hosting        | Firebase Hosting     | Frontend CDN                     |
| CI/CD          | GitHub Actions       | Automated testing/deployment     |

---

## Design Principles

1. **Separation of Concerns**: Clear boundaries between layers
2. **DRY (Don't Repeat Yourself)**: Reusable components and utilities
3. **SOLID Principles**: Modular, testable code
4. **API-First Design**: Backend agnostic to frontend implementation
5. **Security by Default**: All endpoints require authentication unless explicitly public
6. **Fail Fast**: Validate early, return errors immediately
7. **Audit Everything**: Complete change tracking for compliance

---

## Future Enhancements

### Short Term
- TypeScript migration for type safety
- GraphQL API for flexible queries
- WebSocket support for real-time updates

### Long Term
- Microservices architecture for specific domains
- Event-driven architecture with message queue
- Machine learning pipeline for AI features
- Mobile native applications (React Native/Flutter)

---

**Last Updated**: 2025-11-18
**Version**: 0.1.0 (MVP)
