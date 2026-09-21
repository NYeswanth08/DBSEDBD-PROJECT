# 🚌 School Bus Portal

An intelligent, full-stack School Bus Tracking and Student Safety Management platform featuring real-time GPS tracking, automated Haversine geofenced stop detection, normalized parent-student relationship management, and dedicated portals for Administrators, Drivers, and Parents.

---

## 🌟 Key Features

- **🛡️ Admin Portal:** Complete fleet control — manage buses, drivers, routes, stops, and students. Includes a **Google Maps URL Coordinate Resolver** to auto-extract latitude/longitude for bus stops, and a **Transport Assignment Workflow** to assign students to specific trips and designated pickup/dropoff stops.
- **👨‍✈️ Driver Portal:** View assigned trips, start/complete trip lifecycles, take digital student roll calls (Boarding/Drop-off status), and transmit live device GPS telemetry.
- **👨‍👩‍👧 Parent Portal:** View child-specific commute status in real time, monitor bus progression on a RedBus-style route stepper, view route maps, and receive in-app alerts when the bus reaches the designated stop.
- **📍 Real-Time Telemetry & Geofencing:** Backend computes exact spherical distances using the **Haversine Formula** (100m arrival threshold) with duplicate-alert suppression.
- **🔒 Relational Integrity & Security:** Role-based JWT authentication (`ADMIN`, `DRIVER`, `PARENT`) with many-to-many `parent_students` bridge authority and stale-trip protection.

---

## 🏗️ Architecture & Tech Stack

- **Frontend:** React 18, Vite, React Router v6, OpenStreetMap / Leaflet, Pure Modular CSS
- **Backend:** Node.js (ESM), Express.js REST API, JSON Web Tokens (JWT), Bcrypt.js
- **Database:** MySQL 8+ with relational foreign keys and indexes

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **MySQL Server** (v8.0+ running on port `3306`)
- **Git** (for version control)

---

### 2. Database Setup
1. Start your local MySQL service.
2. Create the database and tables using the schema script:
   ```bash
   mysql -u root -p < backend/database/schema.sql
   ```

---

### 3. Backend Setup
1. Open a terminal and navigate to `backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration file:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update database credentials (`DB_USER`, `DB_PASSWORD`, `DB_NAME=school_bus_portal`) and set a secure `JWT_SECRET`.
4. Start the backend server:
   ```bash
   npm start
   ```
   *The API will listen at: `http://localhost:5000`*
   *Verify health at: `http://localhost:5000/api/health`*

---

### 4. Frontend Setup
1. Open a second terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Vite development server:
   ```bash
   npm run dev
   ```
   *The portal will open at: `http://localhost:5173`*

---

## 🔑 Demo Accounts

| Role | Email / Identifier | Password | Access Portal |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@schoolbus.local` | `Admin@12345` | `/admin/dashboard` |
| **Driver** | `ramusuryapakula@gmail.com` | `Driver@12345` | `/driver/trips` |
| **Driver** | `rajesh.driver@schoolbus.local` | `Driver@12345` | `/driver/trips` |
| **Parent** | `rahul.parent@example.com` *(or Phone: `9876543210`)* | `Parent@12345` | `/parent/dashboard` |

---

## 🧪 Verification & Automated Tests

Run the full automated test suite from the `backend` directory:
```bash
cd backend
node scripts/test-parent.mjs
node scripts/test-hardening-defects.mjs
node scripts/test-tracking.mjs
node scripts/test-driver-endpoints.mjs
node scripts/verify-e2e-scenario.mjs
node scripts/verify-parent-login-suite.mjs
```

Build frontend for production:
```bash
cd frontend
npm run build
```
