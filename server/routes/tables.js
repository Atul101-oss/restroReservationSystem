const express = require('express');
const { body, validationResult } = require('express-validator');
const Table = require('../models/Table');
const Reservation = require('../models/Reservation');
const { protect, authorize } = require('../middleware/authrization');

const router = express.Router();

/**
 * @route   GET /api/tables
 * @desc    Get all tables
 * @access  Private (any authenticated user)
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.status(200).json({ success: true, count: tables.length, data: tables });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/tables/available
 * @desc    Get available tables for a specific date, time slot, and guest count
 * @access  Private (any authenticated user)
 */
router.get('/available', protect, async (req, res, next) => {
  try {
    const { date, timeSlot, guests, isShared } = req.query;

    if (!date || !timeSlot || !guests) {
      return res.status(400).json({
        success: false,
        message: 'Please provide date, timeSlot, and guests query parameters',
      });
    }

    const guestCount = parseInt(guests, 10);
    if (isNaN(guestCount) || guestCount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Guests must be a positive number',
      });
    }

    // Normalize date to start of day
    const reservationDate = new Date(date);
    reservationDate.setHours(0, 0, 0, 0);

    const isSharedBooking = isShared === 'true';

    // Get available tables (including shared ones if isSharedBooking is true)
    const availableTables = await Reservation.findAvailableTables(
      reservationDate,
      timeSlot,
      guestCount,
      isSharedBooking
    );

    const getRemainingCapacity = (t) => {
      if (t.currentOccupancy !== undefined) {
        return t.capacity - t.currentOccupancy;
      }
      return t.capacity;
    };

    // Check if any single table fits (using remaining capacity for shared tables)
    const singleFitTables = availableTables.filter((t) => getRemainingCapacity(t) >= guestCount);
    const needsMultiTable = singleFitTables.length === 0 && availableTables.length > 0;

    // Build a suggested multi-table combination (greedy: largest remaining first)
    let suggestedTables = [];
    if (needsMultiTable) {
      let remaining = guestCount;
      const sorted = [...availableTables].sort((a, b) => getRemainingCapacity(b) - getRemainingCapacity(a));
      for (const t of sorted) {
        if (remaining <= 0) break;
        suggestedTables.push(t);
        remaining -= getRemainingCapacity(t);
      }
      // If even all tables aren't enough, clear suggestion
      if (remaining > 0) {
        suggestedTables = [];
      }
    }

    res.status(200).json({
      success: true,
      count: availableTables.length,
      data: availableTables,
      needsMultiTable,
      suggestedTableIds: suggestedTables.map((t) => t._id || t.id),
      suggestedCapacity: suggestedTables.reduce((sum, t) => sum + getRemainingCapacity(t), 0),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/tables
 * @desc    Create a new table
 * @access  Private (Admin only)
 */
router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('tableNumber')
      .isInt({ min: 1 })
      .withMessage('Table number must be a positive integer'),
    body('capacity')
      .isInt({ min: 1, max: 20 })
      .withMessage('Capacity must be between 1 and 20'),
    body('location')
      .optional()
      .isIn(['indoor', 'outdoor', 'window', 'patio', 'private'])
      .withMessage('Invalid location'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array().map((e) => e.msg).join(', '),
        });
      }

      const table = await Table.create(req.body);
      res.status(201).json({ success: true, data: table });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/tables/:id
 * @desc    Update a table
 * @access  Private (Admin only)
 */
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found',
      });
    }

    res.status(200).json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/tables/:id
 * @desc    Delete a table
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    // Check if table has any active reservations
    const activeReservations = await Reservation.countDocuments({
      tables: req.params.id,
      status: 'confirmed',
      date: { $gte: new Date() },
    });

    if (activeReservations > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete table with ${activeReservations} active future reservation(s). Cancel them first.`,
      });
    }

    const table = await Table.findByIdAndDelete(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found',
      });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
