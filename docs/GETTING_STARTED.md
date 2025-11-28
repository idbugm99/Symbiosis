# Getting Started with Symbiosis

This guide will help you set up and run Symbiosis for the first time.

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```

2. **PostgreSQL** (v14 or higher)
   ```bash
   psql --version  # Should be 14.0 or higher
   ```

3. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version
   ```

4. **Git**
   ```bash
   git --version
   ```

### Accounts Needed

- **Firebase Account**: Sign up at https://firebase.google.com/
- **Google Account**: For Firebase authentication

---

## Step 1: Project Setup

### Clone or Initialize Project

If you haven't already:

```bash
cd /Users/programmer/Projects/Camille
```

### Install Dependencies

```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
npm install

# Return to root
cd ..
```

---

## Step 2: Firebase Setup

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: `symbiosis` (or your preferred name)
4. Follow the setup wizard

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method
4. (Optional) Enable **Google** sign-in

### 3. Get Firebase Configuration

1. In Firebase Console, click the **⚙️ Settings** icon
2. Go to **Project settings**
3. Scroll down to "Your apps"
4. Click the **Web** icon (`</>`)
5. Register your app with nickname: `symbiosis-web`
6. Copy the Firebase configuration object

### 4. Download Service Account Key

1. In Firebase Console, go to **Project settings** → **Service accounts**
2. Click "Generate new private key"
3. Save the JSON file as `backend/config/serviceAccountKey.json`
4. **⚠️ IMPORTANT**: Never commit this file to git

### 5. Configure Frontend

Create `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env` with your Firebase config:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=symbiosis-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=symbiosis-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=symbiosis-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

VITE_API_BASE_URL=http://localhost:5000/api
NODE_ENV=development
```

### 6. Configure Backend

Create `backend/.env`:

```bash
cd ../backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development

FIREBASE_PROJECT_ID=symbiosis-xxxxx
FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json

FRONTEND_URL=http://localhost:3000

# Database (configure in next step)
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=symbiosis
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_SSL=false

LOG_LEVEL=info
```

---

## Step 3: Database Setup

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql prompt:
CREATE DATABASE symbiosis;

# Create user (optional, recommended)
CREATE USER symbiosis_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE symbiosis TO symbiosis_user;

# Exit psql
\q
```

### 2. Run Schema

```bash
cd /Users/programmer/Projects/Camille

# Load schema
psql -U your_username -d symbiosis -f database/schema.sql
```

### 3. Verify Tables

```bash
psql -U your_username -d symbiosis

# In psql:
\dt  # List all tables

# Should see:
# - users
# - chemicals
# - equipment
# - experiments
# - etc.

\q  # Exit
```

---

## Step 4: Create First User

### 1. Start Backend (Temporarily)

```bash
cd backend
npm run dev
```

Leave this running.

### 2. Create User via Firebase Console

1. Go to Firebase Console → **Authentication**
2. Click "Add user"
3. Enter email and password
4. Note the **User UID**

### 3. Set User Role

In your database:

```sql
psql -U your_username -d symbiosis

INSERT INTO users (firebase_uid, email, display_name, role)
VALUES ('firebase-uid-here', 'admin@example.com', 'Admin User', 'admin');
```

Or wait until the user first logs in, then manually update:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## Step 5: Run the Application

### Terminal 1: Backend

```bash
cd /Users/programmer/Projects/Camille/backend
npm run dev
```

Output:
```
Symbiosis API server running on port 5000
Environment: development
```

### Terminal 2: Frontend

```bash
cd /Users/programmer/Projects/Camille/frontend
npm run dev
```

Output:
```
VITE v5.0.8  ready in 523 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### Terminal 3: Firebase Emulators (Optional)

For local Firebase testing:

```bash
cd /Users/programmer/Projects/Camille
firebase emulators:start
```

---

## Step 6: Access the Application

1. Open browser to: **http://localhost:3000**
2. Click "Login"
3. Enter your Firebase credentials
4. You should see the Symbiosis dashboard

---

## Verify Everything Works

### Test API Health

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T...",
  "uptime": 123.45,
  "environment": "development"
}
```

### Test Authenticated Endpoint

1. Login to frontend
2. Open browser DevTools → Network tab
3. Navigate to a page that fetches data
4. Check that API requests include `Authorization: Bearer <token>`

---

## Common Issues

### Issue: "Firebase Admin not initialized"

**Solution**: Check that `FIREBASE_PROJECT_ID` and service account file are correct in `backend/.env`

### Issue: Database connection error

**Solution**:
- Verify PostgreSQL is running: `psql -U postgres`
- Check database credentials in `backend/.env`
- Ensure database `symbiosis` exists

### Issue: CORS error

**Solution**: Ensure `FRONTEND_URL` in `backend/.env` matches your frontend URL exactly

### Issue: "Token verification failed"

**Solution**:
- Ensure Firebase project IDs match in frontend and backend
- Check that service account key is from the correct Firebase project

### Issue: Port already in use

**Solution**:
```bash
# Find process on port
lsof -i :5000  # or :3000

# Kill process
kill -9 <PID>
```

---

## Next Steps

Now that you have Symbiosis running:

1. **Read the docs**: Check `/docs/api/` for API documentation
2. **Explore the codebase**: Start with `frontend/src/main.js` and `backend/server.js`
3. **Add test data**: Create some chemicals, equipment, or experiments
4. **Customize**: Modify the UI or add new features

---

## Development Tips

### Hot Reload

Both frontend and backend support hot reload:
- **Frontend**: Changes automatically reload in browser
- **Backend**: nodemon restarts server on file changes

### Database Migrations

When you change the schema:

```bash
# Create migration file
cd database/migrations
nano 002_add_new_feature.sql

# Run migration
psql -U your_username -d symbiosis -f 002_add_new_feature.sql
```

### Debugging

**Frontend**:
- Use browser DevTools
- Check Console for errors
- Use Network tab to inspect API calls

**Backend**:
- Check terminal output for errors
- Logs are in `backend/logs/`
- Use `console.log()` or debugger

---

## Getting Help

- **Documentation**: `/docs/` directory
- **Architecture**: `/docs/architecture/SYSTEM_OVERVIEW.md`
- **Database**: `/database/README.md`
- **Issues**: File an issue in the project repository

---

**Congratulations! You're ready to start developing with Symbiosis!** 🎉
