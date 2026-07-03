const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Table = require('../models/Table');
const Reservation = require('../models/Reservation');

const tables = [
  { tableNumber: 1, capacity: 2, location: 'window' },
  { tableNumber: 2, capacity: 2, location: 'indoor' },
  { tableNumber: 3, capacity: 4, location: 'indoor' },
  { tableNumber: 4, capacity: 4, location: 'window' },
  { tableNumber: 5, capacity: 4, location: 'outdoor' },
  { tableNumber: 6, capacity: 6, location: 'indoor' },
  { tableNumber: 7, capacity: 6, location: 'patio' },
  { tableNumber: 8, capacity: 8, location: 'private' },
  { tableNumber: 9, capacity: 8, location: 'indoor' },
  { tableNumber: 10, capacity: 10, location: 'private' },
];

const users = [
  {
    name: 'Admin User',
    email: 'admin@restaurant.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'John Customer',
    email: 'john@example.com',
    password: 'customer123',
    role: 'customer',
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding...');

    // Clear existing data
    await Reservation.deleteMany();
    await Table.deleteMany();
    await User.deleteMany();
    console.log('Cleared existing data.');

    // Seed users
    const createdUsers = await User.create(users);
    console.log(`Seeded ${createdUsers.length} users:`);
    createdUsers.forEach((u) =>
      console.log(`  - ${u.name} (${u.email}) [${u.role}]`)
    );

    // Seed tables
    const createdTables = await Table.create(tables);
    console.log(`Seeded ${createdTables.length} tables.`);

    console.log('\n--- Seed Complete ---');
    console.log('Admin login:    admin@restaurant.com / admin123');
    console.log('Customer login: john@example.com / customer123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
};

seedDatabase();
