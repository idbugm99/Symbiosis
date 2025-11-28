import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import middleware
import { errorHandler } from './app/middleware/errorHandler.js';
import { requestLogger } from './app/middleware/requestLogger.js';
import { authMiddleware } from './app/middleware/auth.js';

// Import routes
import chemicalsRoutes from './app/routes/chemicals.js';
import equipmentRoutes from './app/routes/equipment.js';
import experimentsRoutes from './app/routes/experiments.js';
import usersRoutes from './app/routes/users.js';
import healthRoutes from './app/routes/health.js';

// Import services
import { initializeFirebaseAdmin } from './app/services/firebase.js';
import { logger } from './app/utils/logger.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase Admin
initializeFirebaseAdmin();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// Health check route (no auth required)
app.use('/health', healthRoutes);

// API routes (with authentication)
app.use('/api/chemicals', authMiddleware, chemicalsRoutes);
app.use('/api/equipment', authMiddleware, equipmentRoutes);
app.use('/api/experiments', authMiddleware, experimentsRoutes);
app.use('/api/users', authMiddleware, usersRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Symbiosis API',
    version: '0.1.0',
    description: 'Scientific research and data-management platform backend',
    status: 'operational',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Symbiosis API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
