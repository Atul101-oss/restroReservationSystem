const express = require('express');
const { body, validationResult } = require('express-validator');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Valid time slots for reference
const VALID_TIME_SLOTS = [
  '09:00-11:00',
  '11:00-13:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
  '19:00-21:00',
  '21:00-23:00',
];

/**
 * @route   POST /api/reservations
 * @desc    Create a new reservation (auto-assigns best-fit table)
 * @access  Private (Customer)
 */
router.post(
  '/',
  protect,
  authorize('customer'),
  [
    body('date').notEmpty().withMessage('Reservation date is required'),
    body('timeSlot')
      .isIn(VALID_TIME_SLOTS)
      .withMessage(
        `Time slot must be one of: ${VALID_TIME_SLOTS.join(', ')}`
      ),
    body('guests')
      .isInt({ min: 1, max: 20 })
      .withMessage('Number of guests must be between 1 and 20'),
    body('specialRequests')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Special requests cannot exceed 500 characters'),
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

      const { date, timeSlot, guests, specialRequests, tableId } = req.body;
      const guestCount = parseInt(guests, 10);

      // Normalize date to start of day for consistent comparison
      const reservationDate = new Date(date);
      reservationDate.setHours(0, 0, 0, 0);

      // Don't allow past-date reservations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (reservationDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Cannot make reservations for past dates',
        });
      }

      let assignedTable;

      if (tableId) {
        // If a specific table is requested, validate it
        const table = await Table.findById(tableId);
        if (!table || !table.isActive) {
          return res.status(400).json({
            success: false,
            message: 'Selected table is not available',
          });
        }

        if (table.capacity < guestCount) {
          return res.status(400).json({
            success: false,
            message: `Table ${table.tableNumber} has a capacity of ${table.capacity}, but you have ${guestCount} guests`,
          });
        }

        // Check if the table is available for the requested date/time
        const isAvailable = await Reservation.isTableAvailable(
          tableId,
          reservationDate,
          timeSlot
        );

        if (!isAvailable) {
          return res.status(409).json({
            success: false,
            message: `Table ${table.tableNumber} is already booked for ${timeSlot} on ${reservationDate.toDateString()}`,
          });
        }

        assignedTable = table;
      } else {
        // Auto-assign the best-fit table (smallest capacity that fits)
        const availableTables = await Reservation.findAvailableTables(
          reservationDate,
          timeSlot,
          guestCount
        );

        if (availableTables.length === 0) {
          return res.status(409).json({
            success: false,
            message: `No tables available for ${guestCount} guest(s) at ${timeSlot} on ${reservationDate.toDateString()}. Please try a different time or date.`,
          });
        }

        // Pick the table with the smallest sufficient capacity (already sorted)
        assignedTable = availableTables[0];
      }

      // Create the reservation
      const reservation = await Reservation.create({
        user: req.user.id,
        table: assignedTable._id,
        date: reservationDate,
        timeSlot,
        guests: guestCount,
        specialRequests,
      });

      // Populate for response
      const populatedReservation = await Reservation.findById(reservation._id)
        .populate('table', 'tableNumber capacity location')
        .populate('user', 'name email');

      res.status(201).json({
        success: true,
        data: populatedReservation,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/reservations/my
 * @desc    Get current user's reservations
 * @access  Private (Customer)
 */
router.get('/my', protect, async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ user: req.user.id })
      .populate('table', 'tableNumber capacity location')
      .sort({ date: -1, timeSlot: 1 });

    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/reservations/:id/cancel
 * @desc    Cancel own reservation (Customer)
 * @access  Private (Customer)
 */
router.put('/:id/cancel', protect, async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      });
    }

    // Customers can only cancel their own reservations
    if (
      req.user.role === 'customer' &&
      reservation.user.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own reservations',
      });
    }

    if (reservation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Reservation is already cancelled',
      });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    const updatedReservation = await Reservation.findById(reservation._id)
      .populate('table', 'tableNumber capacity location')
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: updatedReservation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reservations
 * @desc    Get all reservations (with optional date filter)
 * @access  Private (Admin only)
 */
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    let query = {};

    // Optional date filter
    if (req.query.date) {
      const filterDate = new Date(req.query.date);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      query.date = { $gte: filterDate, $lt: nextDay };
    }

    // Optional status filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    const reservations = await Reservation.find(query)
      .populate('table', 'tableNumber capacity location')
      .populate('user', 'name email')
      .sort({ date: -1, timeSlot: 1 });

    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/reservations/:id
 * @desc    Update any reservation (Admin)
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  protect,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const reservation = await Reservation.findById(req.params.id);

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found',
        });
      }

      const { date, timeSlot, guests, status, tableId, specialRequests } = req.body;

      // If changing date, timeSlot, or table, check availability
      const newDate = date ? new Date(date) : reservation.date;
      newDate.setHours(0, 0, 0, 0);
      const newTimeSlot = timeSlot || reservation.timeSlot;
      const newGuests = guests ? parseInt(guests, 10) : reservation.guests;
      const newTableId = tableId || reservation.table;

      // Validate the new table capacity
      const table = await Table.findById(newTableId);
      if (!table || !table.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Selected table is not available',
        });
      }

      if (table.capacity < newGuests) {
        return res.status(400).json({
          success: false,
          message: `Table ${table.tableNumber} has a capacity of ${table.capacity}, but ${newGuests} guests requested`,
        });
      }

      // Check availability (excluding the current reservation)
      if (
        date ||
        timeSlot ||
        tableId
      ) {
        const isAvailable = await Reservation.isTableAvailable(
          newTableId,
          newDate,
          newTimeSlot,
          reservation._id
        );

        if (!isAvailable) {
          return res.status(409).json({
            success: false,
            message: `Table ${table.tableNumber} is already booked for ${newTimeSlot} on ${newDate.toDateString()}`,
          });
        }
      }

      // Apply updates
      reservation.date = newDate;
      reservation.timeSlot = newTimeSlot;
      reservation.guests = newGuests;
      reservation.table = newTableId;
      if (status) reservation.status = status;
      if (specialRequests !== undefined) reservation.specialRequests = specialRequests;

      await reservation.save();

      const updatedReservation = await Reservation.findById(reservation._id)
        .populate('table', 'tableNumber capacity location')
        .populate('user', 'name email');

      res.status(200).json({
        success: true,
        data: updatedReservation,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/reservations/:id
 * @desc    Delete (cancel) any reservation (Admin)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const reservation = await Reservation.findById(req.params.id);

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found',
        });
      }

      reservation.status = 'cancelled';
      await reservation.save();

      res.status(200).json({
        success: true,
        message: 'Reservation cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
