import express from 'express';
import { authorize } from '../middleware/auth.js';
import EquipmentService from '../services/EquipmentService.js';

const router = express.Router();

/**
 * Get all equipment
 * GET /api/equipment
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await EquipmentService.getAll(req.query);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get equipment by ID
 * GET /api/equipment/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const equipment = await EquipmentService.getById(id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new equipment
 * POST /api/equipment
 */
router.post('/', authorize(['admin', 'supervisor']), async (req, res, next) => {
  try {
    const equipmentData = req.body;
    const userId = req.user.uid;

    const newEquipment = await EquipmentService.create(equipmentData, userId);

    res.status(201).json({
      success: true,
      data: newEquipment
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update equipment
 * PUT /api/equipment/:id
 */
router.put('/:id', authorize(['admin', 'supervisor']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.uid;

    const updatedEquipment = await EquipmentService.update(id, updateData, userId);

    res.json({
      success: true,
      data: updatedEquipment,
      message: 'Equipment updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete equipment
 * DELETE /api/equipment/:id
 */
router.delete('/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    await EquipmentService.delete(id, userId);

    res.json({
      success: true,
      message: 'Equipment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Widget endpoints - Calibration schedule
 * GET /api/equipment/widget/calibration
 */
router.get('/widget/calibration', async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const daysAhead = parseInt(req.query.daysAhead) || 30;

    const schedule = await EquipmentService.getCalibrationSchedule(userId, daysAhead);

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Widget endpoints - Status monitor
 * GET /api/equipment/widget/status
 */
router.get('/widget/status', async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const statusData = await EquipmentService.getStatusMonitor(userId);

    res.json({
      success: true,
      data: statusData
    });
  } catch (error) {
    next(error);
  }
});

export default router;
