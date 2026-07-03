# ReserveTable — Restaurant Reservation Management System

A full-stack restaurant reservation management system built with **React**, **Node.js/Express**, and **MongoDB**. Supports customer-facing table booking and administrative reservation management with role-based access control.

---

## 🚀 Live Demo

> _Deployment URL will be added after deployment._

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@restaurant.com | admin123 |
| Customer | john@example.com | customer123 |

---

## 📋 Table of Contents
- [Setup Instructions](#setup-instructions)
- [Project Structure](#project-structure)
- [Assumptions](#assumptions)
- [Reservation & Availability Logic](#reservation--availability-logic)
- [Role-Based Access Control](#role-based-access-control)
- [API Endpoints](#api-endpoints)
- [Known Limitations](#known-limitations)
- [Areas for Improvement](#areas-for-improvement)

---

## 🛠 Setup Instructions

### Prerequisites
- **Node.js** (v18+)
- **MongoDB** (running locally or a MongoDB Atlas URI)
- **npm** (v9+)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd agenticReseavation
```

### 2. Backend Setup
```bash
cd server
cp .env.example .env      # Edit .env with your MongoDB URI and JWT secret
npm install
npm run seed               # Seeds 10 tables, 1 admin, and 1 customer user
npm run dev                # Starts backend on port 5000
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev                # Starts frontend on port 5173
```

### 4. Access the application
Open `http://localhost:5173` in your browser.

---

## 📁 Project Structure

```
├── server/
│   ├── config/         # Database connection
│   ├── middleware/      # Auth (JWT), error handling
│   ├── models/         # Mongoose schemas (User, Table, Reservation)
│   ├── routes/         # Express API routes
│   ├── seed/           # Database seeder
│   ├── server.js       # Express entry point
│   └── .env.example    # Environment variables template
│
├── client/
│   ├── src/
│   │   ├── api/        # Axios API layer
│   │   ├── components/ # Navbar, ProtectedRoute
│   │   ├── context/    # AuthContext (JWT state management)
│   │   ├── pages/      # Login, Register, Customer & Admin views
│   │   ├── utils/      # Helpers, constants
│   │   ├── App.jsx     # Root component with routing
│   │   └── index.css   # Complete CSS design system
│   └── vite.config.js  # Vite config with API proxy
│
└── README.md
```

---

## 📌 Assumptions

1. **Single Restaurant**: The system manages one restaurant with a fixed set of tables.
2. **Predefined Time Slots**: Reservations use 2-hour fixed slots (09:00–23:00).
3. **Table Seeding**: 10 tables are pre-seeded with capacities from 2–10 guests.
4. **One Reservation Per Table Per Slot**: Each table can only hold one reservation per time slot.
5. **Customer Registration**: All new registrations default to the `customer` role. Admin accounts are created via the seed script.
6. **No Payment Integration**: The system focuses on reservation management only.

---

## 🔄 Reservation & Availability Logic

This is a **key design area** of the system:

### Creating a Reservation
1. Customer selects a **date**, **time slot**, and **number of guests**.
2. The system queries all **active tables** with `capacity ≥ guests`.
3. It then checks for any **confirmed reservations** on that date + time slot.
4. Tables already booked are filtered out, leaving only **available tables**.
5. Available tables are sorted by **capacity ascending** (smallest-first fit).
6. If the customer selects a specific table, it validates that table's availability.
7. If no table is selected, the system **auto-assigns the best-fit table** (smallest available table that fits the party).

### Conflict Prevention
- **Double-booking prevention**: Before creating a reservation, the system checks `Reservation.isTableAvailable()` which queries for any existing confirmed reservation on the same table + date + time slot.
- **Capacity validation**: The table's `capacity` must be ≥ the requested `guests` count.
- **Past-date rejection**: Reservations cannot be created for dates in the past.
- **Status-aware**: Only `confirmed` reservations count as conflicts; `cancelled` reservations free up the slot.

### Admin Updates
When an admin updates a reservation (date, time, or table), the system re-validates availability **excluding the current reservation** from conflict checks to avoid false conflicts.

---

## 🔐 Role-Based Access Control

### Implementation
- **JWT Authentication**: Users receive a signed JWT token on login/register containing `{ id, role }`.
- **Auth Middleware** (`protect`): Verifies the JWT token and attaches the user to `req.user`.
- **Role Guard** (`authorize`): Restricts routes to specific roles (e.g., `authorize('admin')`).

### Access Matrix

| Feature | Customer | Admin |
|---------|----------|-------|
| Register & Login | ✅ | ✅ |
| Create reservation | ✅ | ✗ |
| View own reservations | ✅ | ✗ |
| Cancel own reservation | ✅ | ✗ |
| View all reservations | ✗ | ✅ |
| Filter reservations by date | ✗ | ✅ |
| Update any reservation | ✗ | ✅ |
| Cancel any reservation | ✗ | ✅ |
| Manage tables (CRUD) | ✗ | ✅ |

### Frontend Enforcement
- **ProtectedRoute** component checks authentication and role before rendering.
- **Navbar** displays role-specific navigation links.
- Unauthorized access redirects to the appropriate dashboard.

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new customer |
| POST | `/api/auth/login` | Login & receive JWT |
| GET | `/api/auth/me` | Get current user |

### Tables
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tables` | Any | List all tables |
| GET | `/api/tables/available?date=&timeSlot=&guests=` | Any | Get available tables |
| POST | `/api/tables` | Admin | Create table |
| PUT | `/api/tables/:id` | Admin | Update table |
| DELETE | `/api/tables/:id` | Admin | Delete table |

### Reservations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reservations` | Customer | Create reservation |
| GET | `/api/reservations/my` | Customer | Get own reservations |
| PUT | `/api/reservations/:id/cancel` | Customer | Cancel own reservation |
| GET | `/api/reservations?date=&status=` | Admin | Get all reservations |
| PUT | `/api/reservations/:id` | Admin | Update reservation |
| DELETE | `/api/reservations/:id` | Admin | Cancel reservation |

---

## ⚠️ Known Limitations

1. **No real-time updates**: Other users' bookings won't reflect until page refresh.
2. **Fixed time slots**: Cannot accommodate custom duration reservations.
3. **Single restaurant**: No multi-tenant/multi-restaurant support.
4. **No email notifications**: Users don't receive booking confirmations via email.
5. **Admin creation**: Admin users can only be created via the seed script.
6. **No pagination**: Large reservation lists are not paginated.

---

## 🔮 Areas for Improvement (with additional time)

1. **Real-time updates** using WebSockets (Socket.io) for live availability.
2. **Email notifications** for booking confirmation and cancellation.
3. **Pagination & search** for admin reservation lists.
4. **Custom time slots** with flexible duration.
5. **Recurring reservations** for regular customers.
6. **Table layout visualization** with an interactive floor plan.
7. **Admin user management** to create/promote admin accounts from the UI.
8. **Unit & integration tests** using Jest and Supertest.
9. **Rate limiting** to prevent API abuse.
10. **Audit logging** to track who modified reservations.

---

## 🧰 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router, Axios |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Authentication | JWT (jsonwebtoken, bcryptjs) |
| UI | Custom CSS (dark theme) |
| Dev Tools | Vite, Nodemon |
