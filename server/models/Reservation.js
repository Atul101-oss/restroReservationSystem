const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reservation must belong to a user'],
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Reservation must be assigned to a table'],
    },
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
    specialRequests: {
      type: String,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent double bookings at the database level
reservationSchema.index({ table: 1, date: 1, timeSlot: 1 }, { unique: false });

// Static method to check table availability
reservationSchema.statics.isTableAvailable = async function (
  tableId,
  date,
  timeSlot,
  excludeReservationId = null
) {
  const query = {
    table: tableId,
    date: date,
    timeSlot: timeSlot,
    status: 'confirmed',
  };

  // When updating an existing reservation, exclude it from the conflict check
  if (excludeReservationId) {
    query._id = { $ne: excludeReservationId };
  }

  const existingReservation = await this.findOne(query);
  return !existingReservation;
};

// Static method to find available tables for a given date, time slot, and guest count
reservationSchema.statics.findAvailableTables = async function (
  date,
  timeSlot,
  guests
) {
  const Table = mongoose.model('Table');

  // Get all active tables with sufficient capacity
  const suitableTables = await Table.find({
    capacity: { $gte: guests },
    isActive: true,
  }).sort({ capacity: 1 }); // Sort by capacity ascending for optimal assignment

  // Get all confirmed reservations for the given date and time slot
  const bookedReservations = await this.find({
    date: date,
    timeSlot: timeSlot,
    status: 'confirmed',
  }).select('table');

  const bookedTableIds = bookedReservations.map((r) => r.table.toString());

  // Filter out booked tables
  const availableTables = suitableTables.filter(
    (table) => !bookedTableIds.includes(table._id.toString())
  );

  return availableTables;
};

module.exports = mongoose.model('Reservation', reservationSchema);
