# ReserveTable — Restaurant Reservation Management System

ReserveTable is a full-stack, responsive Restaurant Reservation Management System built using the **MERN** stack (MongoDB, Express, React, Node.js). 

This repository implements a role-based reservation workflow, real-time table availability tracking, and advanced business logic including **multi-table auto-recommendations** and **shared-table social dining**.

---

## 🚀 Live Demo

> **Live Deployment URL:** http://ec2-13-48-13-23.eu-north-1.compute.amazonaws.com/    
> **Frontend Repository:** https://github.com/Atul101-oss/restroReservationSystem

### Demo Credentials
| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | `admin@restaurant.com` | `admin123` | Full administrative controls, CRUD tables, modify bookings |
| **Customer** | `john@example.com` | `customer123` | Create bookings, view personal list, cancel bookings |

---

## 📋 Table of Contents
- [Setup Instructions](#-setup-instructions)
- [Assumptions Made](#-assumptions-made)
- [Reservation Availability & Conflict Handling](#-reservation-availability--conflict-handling)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Backend API & Data Modeling](#-backend-api--data-modeling)
- [Frontend Integration & Role-Specific Views](#-frontend-integration--role-specific-views)
- [Known Limitations & Future Improvements](#-known-limitations--future-improvements)
- [Technology Stack](#-technology-stack)

---

## 🛠 Setup Instructions

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **npm** (v9.0.0 or higher)
* **MongoDB** (Local instance or MongoDB Atlas Connection string)

### 1. Database & Backend Configuration
Navigate to the `/server` folder:
```bash
cd server
```
Create a `.env` file in the root of the server directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/restroReservationSystem
JWT_SECRET=your_super_secure_jwt_secret_key
```
Install dependencies and run the seed script:
```bash
npm install
npm run seed
```
> 💡 *The seed script clears existing collections and creates the 10 core tables with capacities from 2 to 10 guests, alongside the default Customer and Admin accounts.*

Start the backend server:
```bash
npm run dev
```

### 2. Frontend Configuration
Navigate to the `/client` folder:
```bash
cd ../client
```
Install dependencies and start the Vite dev server:
```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📌 Assumptions Made

1. **Fixed Operating Hours & Time Slots:** The restaurant operates on fixed, 2-hour dining windows (e.g., `09:00-11:00`, `11:00-13:00`, up to `21:00-23:00`). Custom booking durations are out of scope.
2. **Single-Tenant Structure:** The application manages a single physical restaurant.
3. **No Overlapping Bookings:** For private tables, a table cannot hold more than one reservation in a single slot. For shared tables, reservations can overlap up to the table's total seat capacity.
4. **Instant Cancellation Window:** Customers can cancel bookings instantly at any point before the slot's scheduled start time.

---

## 🔄 Reservation Availability & Conflict Handling

The validation engine prevents double-bookings, seats guests optimally, and maximizes seat utilization:

### 1. Double-Booking & Conflict Checks
When a reservation is requested:
* The system queries the `Reservation` database for all confirmed bookings matching the selected `date` and `timeSlot`.
* If a table is assigned to a non-shared reservation, it is marked as **unavailable** for that time slot.
* If a table is assigned to shared reservations, the system sums up the active guest counts on that table. The remaining capacity is computed as:
  $$\text{Remaining Capacity} = \text{Table Capacity} - \sum \text{Guests on active shared reservations}$$
  If the remaining capacity is $\ge$ the requested guest count, the table is considered **available** for sharing.

### 2. Multi-Table Auto-Assignment
If a customer leaves the table selection empty:
* **Single Best-Fit:** The system checks if any single available table has a capacity (or remaining capacity) $\ge$ the guest count. It picks the smallest sufficient table to keep larger tables free.
* **Greedy Solver:** If the party size is larger than the capacity of any single table, the system switches to multi-table mode:
  1. It fetches all available tables.
  2. It sorts them descending by remaining capacity.
  3. It greedily selects tables from the top of the list until the combined capacity fits the party.
  4. If the combined capacities of all available tables still cannot accommodate the party, it rejects the booking.

### 3. Time Constraints
* Past dates are fully blocked.
* Same-day bookings check the current time. If a slot's start time has passed (e.g. current time is 13:15 for an `11:00-13:00` slot), that option is disabled on the client side and rejected by backend validators.

---

## 🔐 Role-Based Access Control (RBAC)

Security is handled via stateless JSON Web Tokens (JWT):

### 1. Verification Flow
1. Upon successful login/registration, the backend generates a JWT containing `{ id, role }`.
2. The client stores this token in `localStorage` and provides it in the `Authorization: Bearer <token>` header for all subsequent API requests.
3. The `protect` middleware decodes the token and attaches the validated User object to `req.user`.

### 2. Authorization Rules
The `authorize(...roles)` middleware restricts route access. For example:
* **`authorize('customer')`**: Restricts actions like booking and cancellation of own reservations.
* **`authorize('admin')`**: Safeguards administrative panels, global logs, and table CRUD management.

---

## 📐 Backend API & Data Modeling

### 1. Data Models (Mongoose)

#### **User Schema**
* `name` (String, Required)
* `email` (String, Required, Unique)
* `password` (String, Required, Encrypted with bcrypt)
* `role` (String: `customer` | `admin`, Default: `customer`)

#### **Table Schema**
* `tableNumber` (Number, Required, Unique)
* `capacity` (Number, Required, Min: 1)
* `location` (String: `indoor` | `outdoor` | `window` | `patio` | `private`)
* `isActive` (Boolean, Default: `true`)

#### **Reservation Schema**
* `user` (ObjectId ref: 'User', Required)
* `tables` (Array of ObjectId refs: 'Table', Required) — *Upgraded from a single field to an array to support multi-table booking.*
* `date` (Date, Required)
* `timeSlot` (String, Required, Enum)
* `guests` (Number, Required, Max: 20)
* `status` (String: `confirmed` | `cancelled`, Default: `confirmed`)
* `isShared` (Boolean, Default: `false`) — *Supports table sharing.*
* `specialRequests` (String, Maxlength: 500)

---

## 💻 Frontend Integration & Role-Specific Views

The React client features distinct, theme-consistent interfaces tailored to each role:

### 1. Customer Interface
* **Booking Panel:** Features interactive inputs for party sizes and dates. If the guest size requires multiple tables, a warning banner appears offering a "Use Recommended Combination" button.
* **Table Selector:** Displays available tables with location badges and real-time indicators for shared tables (e.g., "4 of 6 seats left" with a green `SHARED` badge).
* **My Bookings:** Groups reservations into All, Upcoming, Past, and Cancelled. Includes inline confirmation menus for secure reservation cancellation.

### 2. Admin Dashboard
* **All Bookings Feed:** A centralized log displaying the customer's credentials, table details (e.g., table numbers, locations, and total capacities), date/time slots, guest counts, and status badges.
* **Log Filters:** Sorts and filters bookings by date or status.
* **Inline Booking Editor:** Allows admins to update the date, time slot, guest counts, and status (Confirm/Cancel) of any booking.
* **Table Management Console:** A CRUD interface enabling admins to dynamically add, edit, or delete restaurant tables.

---

## ⚠️ Known Limitations & Future Improvements

### Known Limitations
1. **Stateless Table Layouts:** The available tables list is grid-based rather than displaying an interactive 2D map of the floor.
2. **Fixed Slots:** Customers cannot book tables outside the preconfigured 2-hour slots.
3. **No External Notifications:** Confirmations are in-app only, with no SMS/email integration.

### Areas for Improvement (with additional time)
1. **Interactive Floor Plan:** Implement a SVG-based drag-and-drop table grid for customers to visually pick their seats.
2. **WebSockets (Socket.io):** Integrate real-time table availability notifications so users don't need to refresh to see recently booked tables.
3. **SMS & Email Reminders:** Integrate Twilio or SendGrid to send confirmation emails and automated booking reminders.
4. **Historical Analytics:** Add administrative analytics charts tracking busiest dining slots, popular table locations, and average party sizes.

---

## 🧰 Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, React Router, Axios, React Icons, React Hot Toast |
| **Backend** | Node.js, Express, Express Validator |
| **Database** | MongoDB, Mongoose |
| **Auth** | JSON Web Tokens (JWT), BcryptJS |
| **UI** | Custom CSS (Dark Theme, Glassmorphism, Micro-Animations) |
