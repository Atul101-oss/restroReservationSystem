const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: Number,
      required: [true, 'Please provide a table number'],
      unique: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Please provide table capacity'],
      min: [1, 'Capacity must be at least 1'],
      max: [20, 'Capacity cannot exceed 20'],
    },
    location: {
      type: String,
      enum: ['indoor', 'outdoor', 'window', 'patio', 'private'],
      default: 'indoor',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Table', tableSchema);
