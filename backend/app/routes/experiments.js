import express from 'express';
import { authorize } from '../middleware/auth.js';
import ExperimentsService from '../services/ExperimentsService.js';

const router = express.Router();

/**
 * Get all experiments
 * GET /api/experiments
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await ExperimentsService.getAll(req.query);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get experiment by ID
 * GET /api/experiments/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const experiment = await ExperimentsService.getById(id);

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    res.json({
      success: true,
      data: experiment
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new experiment
 * POST /api/experiments
 */
router.post('/', authorize(['admin', 'researcher', 'supervisor']), async (req, res, next) => {
  try {
    const experimentData = req.body;
    const userId = req.user.uid;

    const newExperiment = await ExperimentsService.create(experimentData, userId);

    res.status(201).json({
      success: true,
      data: newExperiment
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update experiment
 * PUT /api/experiments/:id
 */
router.put('/:id', authorize(['admin', 'researcher', 'supervisor']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.uid;

    const updatedExperiment = await ExperimentsService.update(id, updateData, userId);

    res.json({
      success: true,
      data: updatedExperiment,
      message: 'Experiment updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete experiment
 * DELETE /api/experiments/:id
 */
router.delete('/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    await ExperimentsService.delete(id, userId);

    res.json({
      success: true,
      message: 'Experiment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
