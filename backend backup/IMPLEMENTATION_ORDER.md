# Backend Implementation Roadmap (Express & MongoDB Stack)

This roadmap defines the sequential development and integration order of the backend Express app and MongoDB Atlas databases to adapt directly to the Tuhama PRO React frontend.

---

## Phase 1: Infrastructure & Mongoose Models Setup
Establish the project workspace, connection middleware, and database schemas.

1. **Express & Mongoose Setup**:
   - Initialize Express.js application inside the `backend/` directory.
   - Configure global configurations (`dotenv`, CORS policy matching frontend host port, JSON parsers).
   - Configure MongoDB Atlas connection pooling using Mongoose.
2. **Implement Mongoose Schemas**:
   - Write Mongoose schemas according to the specification inside [DATABASE_ENTITY_MAP.md](file:///d:/KT%20projects/laundary-management/backend/DATABASE_ENTITY_MAP.md).
   - Configure schema pre-save hooks (e.g. encrypting passwords using `bcrypt`).
3. **Database Seeding Script**:
   - Create a seeding script to populate:
     - Default roles (`roles` collection: Admin, Counter Staff, Delivery Staff, Super Admin).
     - Default laundry catalog services (`laundryservices` collection).
     - Default branches (`branches` collection).
     - Default testing users (`users` collection: dana@tuhama.com, evan@tuhama.com, frank@tuhama.com, superadmin@tuhama.com).

---

## Phase 2: JWT Authentication & Middleware
Implement user session handlers and route interceptors.

1. **Login & Session Management**:
   - Implement `POST /api/auth/login`. Verify credentials, check lock states, sign and return JWT Access Token (short-lived) + Refresh Token (long-lived).
   - Save Refresh Token inside `refreshtokens` collection to enable secure sessions without redis.
   - Implement `POST /api/auth/refresh` to rotate Access Tokens.
   - Implement `POST /api/auth/logout` which purges tokens from `refreshtokens`.
2. **Access Control Middleware**:
   - Implement token parser middleware to authenticate requests.
   - Implement authorization gates `requirePermission` checking role permission scopes.

---

## Phase 3: Administrative Configuration APIs (Super Admin & Admin)
Branch offices, services catalog, and staff rosters.

1. **Branches CRUD API**:
   - Implement endpoints: `GET /api/branches`, `POST /api/branches`, `PUT /api/branches/:id`, `DELETE /api/branches/:id`.
2. **Laundry Services Catalog API**:
   - Implement endpoints: `GET /api/services`, `POST /api/services`, `PUT /api/services/:id`, `DELETE /api/services/:id`.
3. **Users Control API**:
   - Implement user profiles list.
   - Implement profile editing, password resets, and account locking switches.

---

## Phase 4: Operational Data & Ticketing
Customers profiles and invoicing workflows.

1. **Customers CRM API**:
   - Implement endpoints: `GET /api/customers`, `POST /api/customers`, `PUT /api/customers/:id`.
   - Add phone number lookup queries.
2. **Order Ticketing System**:
   - Implement `POST /api/orders` (Make Invoice). Generates unique invoice reference codes (e.g. `"ORD-00101"`), embeds items list, calculates taxes, discount bounds, and triggers timeline transitions.
   - Automate delivery request triggers: If the delivery type is "Home Delivery", automatically schedule an entry inside the `deliveries` queue.
3. **Order Control & Status API**:
   - Implement list queries `GET /api/orders` with filters.
   - Implement status transitions update endpoint `PUT /api/orders/:id/status`. Appends transition nodes to the embedded `timeline` array.

---

## Phase 5: Logistics & Cash Registers
Driver routing assignments and invoice checkouts.

1. **Payments Billing Register**:
   - Implement endpoints: `GET /api/payments`, `PUT /api/payments/:id`.
   - Update method properties (Cash/Card/UPI) and change invoice status to "Paid".
2. **Logistics Dispatch API**:
   - Implement collections listing (`GET /api/pickups`) and deliveries listing (`GET /api/deliveries`).
   - Implement assign driver endpoints (`PUT /api/pickups/:id/assign`, `PUT /api/deliveries/:id/assign`). Transitions job states and driver workload parameters.
3. **Drivers Directory API**:
   - Implement driver CRUD operations, nationality records, and active area coverage logs.

---

## Phase 6: Alert Feeds & System Settings
Real-time alerts and layout preferences.

1. **Alert Notifications API**:
   - Implement `GET /api/notifications` polling, `PUT /api/notifications/:id/read`, and purge logs.
2. **Settings API**:
   - Fetch and save layout settings objects.

---

## Phase 7: Frontend Axios Integration
Transition from mock local storage cache to production server queries.

1. **Axios client setup**:
   - Add default client with bearer tokens attach interceptors.
2. **Remap State Context**:
   - Replace state list mutations in `AdminStateContext.js` and configurations inside `SettingsContext.jsx` with Axios backend queries.
