import express from 'express';
import { authorize } from '../middleware/auth.js';
import ChemicalsService from '../services/ChemicalsService.js';

const router = express.Router();

/**
 * Get all chemicals
 * GET /api/chemicals
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await ChemicalsService.getAll(req.query);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get chemical by ID
 * GET /api/chemicals/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const chemical = await ChemicalsService.getById(id);

    if (!chemical) {
      return res.status(404).json({
        success: false,
        error: 'Chemical not found'
      });
    }

    res.json({
      success: true,
      data: chemical
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new chemical
 * POST /api/chemicals
 */
router.post('/', authorize(['admin', 'researcher']), async (req, res, next) => {
  try {
    const chemicalData = req.body;
    const userId = req.user.uid;

    const newChemical = await ChemicalsService.create(chemicalData, userId);

    res.status(201).json({
      success: true,
      data: newChemical
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update chemical
 * PUT /api/chemicals/:id
 */
router.put('/:id', authorize(['admin', 'researcher']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.uid;

    const updatedChemical = await ChemicalsService.update(id, updateData, userId);

    res.json({
      success: true,
      data: updatedChemical,
      message: 'Chemical updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete chemical
 * DELETE /api/chemicals/:id
 */
router.delete('/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    await ChemicalsService.delete(id, userId);

    res.json({
      success: true,
      message: 'Chemical deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Widget endpoints - Recent chemicals
 * GET /api/chemicals/widget/recent
 */
router.get('/widget/recent', async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 10;

    const chemicals = await ChemicalsService.getRecent(userId, limit);

    res.json({
      success: true,
      data: chemicals
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Widget endpoints - Favorites
 * GET /api/chemicals/widget/favorites
 */
router.get('/widget/favorites', async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const chemicals = await ChemicalsService.getFavorites(userId);

    res.json({
      success: true,
      data: chemicals
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Widget endpoints - Inventory alerts
 * GET /api/chemicals/widget/alerts
 */
router.get('/widget/alerts', async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const alerts = await ChemicalsService.getInventoryAlerts(userId);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
});

export default router;
