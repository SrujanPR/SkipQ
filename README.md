# SkipQ — Smart Canteen Pre-Ordering Platform

An end-to-end web application that lets college students and staff skip the canteen queue. Students browse the canteen menu, build a cart, and reserve a pickup time slot. Canteen staff manage orders in real time, and college admins oversee canteens and onboarding.


## Highlights
- **Three user roles**: Student, Canteen Staff, and College Admin
- **Slot-based ordering**: 15-minute pickup windows with capacity caps prevent crowding
- **Google + Email auth**: JWT-secured sessions with optional Google Sign-In
- **Live order lifecycle**: pending → preparing → ready → picked up
- **Modern stack**: React 19 + TypeScript + Vite (frontend) and Express + SQLite (backend)
- **Email notifications**: Order updates via Nodemailer (Gmail SMTP)

---

## System Architecture

Layer-by-Layer Explanation

1. **User Layer (Who)**
   - Students place orders; Canteen staff fulfill them; College admins manage canteens, menus, and staff.

2. **Frontend Layer (Interface)**
   - React + TypeScript + Vite, with GSAP animations and lucide icons.
   - Handles login (email/password + Google OAuth), role-based dashboards, cart, and time-slot selection.
   - Talks to the backend via a typed `api.ts` client.

3. **Backend Layer (Brain)**
   - Express 5 (Node.js) with modular routes: `/auth`, `/canteens`, `/menu`, `/orders`, `/timeslots`.
   - JWT middleware guards protected routes.
   - Generates daily time slots and tracks per-slot capacity to throttle pickups.
   - Sends order-status emails via Nodemailer.

4. **Data Layer (Vault)**
   - `better-sqlite3` with WAL journaling, foreign keys, and a self-seeding schema.
   - Tables: `colleges`, `canteens`, `users`, `menu_items`, `time_slots`, `orders`, `order_items`.

5. **Auth Layer**
   - bcrypt-hashed passwords for email/password sign-in.
   - `google-auth-library` verifies Google ID tokens for one-click sign-in.

---

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite 8, GSAP, lucide-react, react-router-dom, react-hot-toast
- **Backend**: Node.js, Express 5, better-sqlite3, JSON Web Tokens, bcryptjs, multer, nodemailer
- **Auth**: JWT + Google OAuth (`google-auth-library`)
- **Database**: SQLite (file-based, WAL mode)
- **Tooling**: npm, dotenv, ESLint

---

## Monorepo Structure
```
SkipQ/
├─ frontend/                # React + TS + Vite app
│  └─ src/
│     ├─ pages/             # Landing, StudentAuth, CanteenAuth, Menu, Cart, MyOrders, StaffMenu, StaffOrders, CollegeAdminDashboard, CanteenSelect
│     ├─ components/        # Navbar, GoogleSignIn
│     ├─ context/           # Auth/cart contexts
│     ├─ types/             # Shared TypeScript types
│     └─ api.ts             # Typed API client
├─ backend/                 # Express + SQLite app
│  ├─ routes/               # auth, canteens, menu, orders, timeslots
│  ├─ middleware/           # JWT auth guard
│  ├─ utils/                # mailer (Nodemailer)
│  ├─ database.js           # Schema + demo seed
│  └─ server.js             # API entrypoint
└─ README.md
```

---

## Getting Started

### Prerequisites
- Node 18+
- npm
- A Gmail account with an App Password (for order emails) — optional in dev
- A Google Cloud OAuth Client ID (for Google Sign-In) — optional in dev

### Environment Variables
Create `.env` files as below.

Backend (`backend/.env`):
```
PORT=3001
JWT_SECRET=<a_long_random_string>
GMAIL_USER=<your_gmail_address>
GMAIL_APP_PASSWORD=<your_gmail_app_password>
GOOGLE_CLIENT_ID=<your_google_oauth_client_id>.apps.googleusercontent.com
```

Frontend (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=<your_google_oauth_client_id>.apps.googleusercontent.com
```

> Never commit real keys. `.env` files are already in `.gitignore`.

### Install & Run

Backend:
```
cd backend
npm install
npm run dev
```
The API starts on `http://localhost:3001`. On first run it auto-creates `skipq.db` and seeds a demo college, canteen, admin, staff, and menu items.

Frontend:
```
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite (usually `http://localhost:5173`).

### Demo Credentials (auto-seeded)
- **College Admin**: `admin@skipq.com` / `admin123`
- **Canteen Staff**: `staff@skipq.com` / `staff123`
- **Student**: register a new account from the Student sign-in page

---

## How It Works

1. **Student**
   - Signs up / signs in (email-password or Google).
   - Picks a canteen, browses the menu, adds items to cart.
   - Selects an available 15-minute pickup slot and places the order.
   - Tracks status from MyOrders.

2. **Canteen Staff**
   - Signs in to the staff dashboard.
   - Sees incoming orders sorted by slot, marks them `preparing` → `ready` → `picked_up`.
   - Toggles menu item availability and prices from StaffMenu.

3. **College Admin**
   - Manages canteens for their college.
   - Provisions canteen staff accounts and oversees catalog data.

4. **Backend Pipeline**
   - On boot, ensures schema and generates today's time slots for every canteen.
   - On order placement, validates slot capacity, decrements the slot, writes `orders` + `order_items` atomically.
   - On status change, can email the student via Gmail SMTP.

---

## API Overview (sample)
- `POST /api/auth/register` → student/staff signup
- `POST /api/auth/login` → email-password sign-in
- `POST /api/auth/google` → Google ID-token sign-in
- `GET /api/canteens` → list canteens for a college
- `GET /api/menu/:canteenId` → fetch a canteen's menu
- `POST /api/menu` → add/update menu item (staff)
- `GET /api/timeslots/:canteenId` → today's slots with remaining capacity
- `POST /api/orders` → place an order
- `GET /api/orders/me` → student's order history
- `GET /api/orders/canteen/:canteenId` → staff order queue
- `PATCH /api/orders/:id/status` → staff updates status
- `GET /api/health` → liveness probe

Auth: send `Authorization: Bearer <JWT>` for protected routes.

---

## Database Schema (summary)
- `colleges(id, name)`
- `canteens(id, college_id, name, description, image_data)`
- `users(id, name, email, password, google_id, role, college_id, canteen_id)` — role ∈ {`student`, `staff`, `college_admin`}
- `menu_items(id, canteen_id, name, description, price, category, image_url, available)`
- `time_slots(id, canteen_id, slot_time, date, max_orders, current_orders)`
- `orders(id, user_id, canteen_id, time_slot_id, status, total_amount, notes)` — status ∈ {`pending`, `preparing`, `ready`, `picked_up`, `cancelled`}
- `order_items(id, order_id, menu_item_id, quantity, price)`

---

## Security Notes
- Passwords hashed with bcrypt; never stored in plaintext.
- All write endpoints sit behind JWT middleware and role checks.
- Foreign keys enforced (`PRAGMA foreign_keys = ON`) and WAL mode enabled for safe concurrent reads.
- Google ID tokens verified server-side before issuing a JWT.
- For production: rotate `JWT_SECRET`, run behind HTTPS, add rate limiting, and migrate from SQLite to managed Postgres.

---

## Future Enhancements
- UPI / Razorpay payment integration
- Push / WhatsApp notifications when an order is ready
- Real-time order board via WebSockets
- Multi-college tenancy with subdomains
- Admin analytics: revenue, peak slots, popular items
- Daily menu scheduling and recurring specials
- Loyalty points and student wallet
- Migration from SQLite → Postgres for scale

---

## Contributing
- Built by Harshitha
- Open an issue to discuss substantial changes.
- Use conventional commits and PRs with clear descriptions.

---

## License

This project is licensed under the MIT License.

---

⭐ Star this repo if it helped you!
