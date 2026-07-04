const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reservation must belong to a user'],
    },
    tables: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
      },
    ],
    date: {
      type: Date,
      required: [true, 'Please provide a reservation date'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Please provide a time slot'],
      enum: {
        values: [
          '09:00-11:00',
          '11:00-13:00',
          '13:00-15:00',
          '15:00-17:00',
          '17:00-19:00',
          '19:00-21:00',
          '21:00-23:00',
        ],
        message: 'Please select a valid time slot',
      },
    },
    guests: {
      type: Number,
      required: [true, 'Please provide number of guests'],
      min: [1, 'At least 1 guest is required'],
      max: [20, 'Maximum 20 guests allowed'],
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    specialRequests: {
      type: String,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Validate that at least one table is assigned
reservationSchema.pre('validate', function (next) {
  if (!this.tables || this.tables.length === 0) {
    this.invalidate('tables', 'Reservation must be assigned to at least one table');
  }
  next();
});

// Static method to check table availability
reservationSchema.statics.isTableAvailable = async function (
  tableId,
  date,
  timeSlot,
  isSharedRequest = false,
  requestGuests = 0,
  excludeReservationId = null
) {
  const Table = mongoose.model('Table');
  const table = await Table.findById(tableId);
  if (!table) return false;

  const query = {
    tables: tableId,
    date: date,
    timeSlot: timeSlot,
    status: 'confirmed',
  };

  // When updating/checking, exclude the current reservation if provided
  if (excludeReservationId) {
    query._id = { $ne: excludeReservationId };
  }

  const existingReservations = await this.find(query);
  if (existingReservations.length === 0) {
    return true; // No bookings on this table, completely available
  }

  // If there are bookings, they must all be shared and the request must be shared
  if (!isSharedRequest) {
    return false; // Request is not shared, but table is already booked
  }

  const hasNonShared = existingReservations.some((r) => !r.isShared);
  if (hasNonShared) {
    return false; // Table has a non-shared booking
  }

  const totalGuestsReserved = existingReservations.reduce((sum, r) => sum + r.guests, 0);
  return (table.capacity - totalGuestsReserved) >= requestGuests;
};

// Static method to find available tables for a given date and time slot
// Returns ALL available active tables (no capacity filter — frontend handles multi-table logic)
// If isShared is true, includes tables that are partially booked but marked as shared
reservationSchema.statics.findAvailableTables = async function (
  date,
  timeSlot,
  guests,
  isShared = false
) {
  const Table = mongoose.model('Table');

  // Get all active tables sorted by capacity ascending
  const allTables = await Table.find({ isActive: true }).sort({ capacity: 1 });

  // Get all confirmed reservations for the given date and time slot
  const bookedReservations = await this.find({
    date: date,
    timeSlot: timeSlot,
    status: 'confirmed',
  }).select('tables isShared guests');

  // Build a map of table usage
  const tableUsage = {};
  bookedReservations.forEach((r) => {
    r.tables.forEach((tId) => {
      const idStr = tId.toString();
      if (!tableUsage[idStr]) {
        tableUsage[idStr] = {
          totalGuests: 0,
          hasNonShared: false,
        };
      }
      tableUsage[idStr].totalGuests += r.guests;
      if (!r.isShared) {
        tableUsage[idStr].hasNonShared = true;
      }
    });
  });

  // Filter tables
  const availableTables = [];
  for (const table of allTables) {
    const usage = tableUsage[table._id.toString()];
    if (!usage) {
      // Completely empty table
      availableTables.push(table);
    } else {
      // Partially or fully booked table
      if (isShared && !usage.hasNonShared) {
        const remainingCapacity = table.capacity - usage.totalGuests;
        if (remainingCapacity >= guests) {
          // Add metadata to table object (Mongoose document to JSON helper)
          const tableObj = table.toObject();
          tableObj.currentOccupancy = usage.totalGuests;
          tableObj.isSharedOption = true;
          availableTables.push(tableObj);
        }
      }
    }
  }

  return availableTables;
};

module.exports = mongoose.model('Reservation', reservationSchema);
