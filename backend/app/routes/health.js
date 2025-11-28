import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'symbiosis-api',
    version: '0.1.0'
  };

  res.status(200).json(healthCheck);
});

/**
 * Detailed health check (includes dependencies)
 * GET /health/detailed
 */
router.get('/detailed', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'symbiosis-api',
    version: '0.1.0',
    dependencies: {
      database: 'not_configured', // Will be implemented with database
      firebase: 'ok',
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      }
    }
  };

  res.status(200).json(checks);
});

export default router;
