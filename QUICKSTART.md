# Symbiosis - Quick Start Guide

**Get up and running in 5 minutes!**

---

## 🚀 Fastest Path to Running

### 1. Install Dependencies (2 min)

```bash
# From project root
cd frontend && npm install
cd ../backend && npm install
cd ..
```

### 2. Configure Environment (1 min)

**Create Firebase project** at https://console.firebase.google.com/

**Frontend** (`frontend/.env`):
```bash
cp frontend/.env.example frontend/.env
# Add your Firebase credentials
```

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
# Add Firebase project ID and database credentials
```

### 3. Setup Database (1 min)

```bash
# Create database
createdb symbiosis

# Load schema
psql -d symbiosis -f database/schema.sql
```

### 4. Run! (1 min)

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

**Access**: http://localhost:3000

---

## 📋 What You Just Built

✅ **25 Files** including:
- Complete frontend with Vite + Handlebars
- Full Express.js backend with Firebase Auth
- PostgreSQL database with comprehensive schema
- API routes for chemicals, equipment, experiments
- Authentication & authorization middleware
- Logging and error handling
- Complete documentation

✅ **Project Structure**:
```
Camille/Symbiosis
├── Frontend (Vite + Handlebars)
├── Backend (Node.js + Express)
├── Database (PostgreSQL schema)
├── Firebase Configuration
├── Documentation
└── Infrastructure configs
```

---

## 🎯 Next Steps

1. **Create first user**: Firebase Console → Authentication → Add user
2. **Set admin role**: `UPDATE users SET role='admin' WHERE email='your@email.com';`
3. **Test the API**: http://localhost:5000/health
4. **Read full docs**: `/docs/GETTING_STARTED.md`

---

## 📚 Key Files to Know

| File | Purpose |
|------|---------|
| `frontend/src/main.js` | Frontend entry point |
| `backend/server.js` | Backend entry point |
| `backend/app/routes/` | API endpoints |
| `database/schema.sql` | Database structure |
| `README.md` | Full project documentation |
| `docs/GETTING_STARTED.md` | Detailed setup guide |

---

## 🔧 Technology Stack

- **Frontend**: Vite, Handlebars, Firebase Auth
- **Backend**: Node.js, Express, Firebase Admin
- **Database**: PostgreSQL
- **Deployment**: Firebase Hosting
- **Auth**: Firebase Authentication

---

## 💡 Pro Tips

1. **Hot reload is enabled** - changes auto-refresh
2. **Check logs** in `backend/logs/` for debugging
3. **Use `/health` endpoint** to verify backend is running
4. **Firebase Emulators** available via `firebase emulators:start`

---

## ❓ Need Help?

- **Full Setup**: See `/docs/GETTING_STARTED.md`
- **Architecture**: See `/docs/architecture/SYSTEM_OVERVIEW.md`
- **Database**: See `/database/README.md`
- **Issues**: Check terminal output and browser console

---

**You're all set! Happy coding! 🎉**
