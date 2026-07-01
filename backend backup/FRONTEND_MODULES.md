# Frontend Modules Inventory

This document lists all modules, layouts, page containers, contexts, and helper utility scripts of the SpinClean / Tuhama PRO Laundry Management System.

---

## 1. Contexts & State Management

These modules manage global application state, caching data in `localStorage` to simulate backend persistence.

| Context File | Description | State Managed |
| :--- | :--- | :--- |
| `AdminStateContext.js` | Core database simulator. Handles list mutations and cross-entity actions. | `customers`, `orders`, `services`, `staff`, `payments`, `pickups`, `deliveries`, `completedJobs`, `drivers`, `catalog`, `branches`, `selectedBranch`, `notifications` |
| `SettingsContext.jsx` | Store configuration and turnaround rules. | `settings` (business, system, notifications, security, payment options) |
| `ThemeContext.jsx` | Handles UI light/dark styling state. | `theme` ('light' \| 'dark') |
| `LanguageContext.jsx` | Exposes translation helper `t()` for localization. | `language` ('en' \| 'ar') |

---

## 2. Layouts

Shell layouts that define sidebar navigation and header sections based on user roles.

| Layout File | Associated Role | Components Mounted |
| :--- | :--- | :--- |
| `SuperAdminLayout.jsx` | Super Admin | `Navbar`, `SuperAdminSidebar`, Router `Outlet` |
| `AdminLayout.jsx` | Admin | `Navbar`, `Sidebar`, Router `Outlet` |
| `CounterLayout.jsx` | Counter Staff | `Navbar`, `CounterSidebar`, Router `Outlet` |
| `DeliveryLayout.jsx` | Delivery Staff | `Navbar`, `DeliverySidebar`, Router `Outlet` |

---

## 3. UI Shell Components

Shared design components that provide the main layout headers, sidebars, and structural controls.

* **Sidebars**:
  * `Sidebar.jsx`: Standard administrative sidebar options.
  * `SuperAdminSidebar.jsx`: Administrative options focused on branches and global user control.
  * `CounterSidebar.jsx`: Action items for ticketing, intake, and invoicing.
  * `DeliverySidebar.jsx`: Route logs, collections, and doorstep delivery lists.
  * `RoleSidebar.jsx`: Base navigation shell rendering custom lists of navigation options.
* **Header Controls**:
  * `Navbar.jsx`: Global topbar housing branch selector dropdown, focus-mode toggle, dark-mode toggle, Arabic/English toggle, real-time alert bell, and profile dropdown menu.
  * `ThemeToggle.jsx`: Icon switch for dark/light preferences.
  * `LanguageSwitcher.jsx`: Language select menu.
* **Shared Tables & Displays**:
  * `ReusableTable.jsx`: Standardized table layout supporting pagination, headers mapping, and page actions.
  * `StatsCard.jsx`: Metric dashboard card with sub-text indicators.
  * `Modal.jsx`: Portal-based overlay modal container.

---

## 4. Analytical Components

These modules render graphs, metric breakdown cards, and visual feeds.

* **Dashboard Visualizers**:
  * `DashboardCharts.jsx`: Area charts (Daily/Monthly revenue), line graphs (Orders trend), and pie charts (Service type share).
  * `ReportCharts.jsx`: Analytical breakdown graphs used inside administrative reports.
  * `ReportTable.jsx`: Custom formatted tables displaying grouped report calculations.

---

## 5. Counter Operational Components

Intake and ticketing controls specifically designed for the counter desk.

* `CustomerTable.jsx`: Lists customer details, area locations, and quick billing links.
* `OrderTable.jsx`: Interactive list showing itemized prices, delivery dates, and actions.
* `OrderTimeline.jsx`: Graphical path showing step-by-step progress from waiting to final retrieval.
* `PaymentTable.jsx`: List of customer invoice values, tax brackets, and payments.

---

## 6. Delivery Operational Components

Logistics lists for drivers/riders on the road.

* `PickupTable.jsx`: List of assigned collections, addresses, and phone contacts.
* `DeliveryTable.jsx`: List of ready-to-deliver customer packages, billing values, and routing parameters.
* `CompletedJobsTable.jsx`: Historical log of completed pickup and delivery jobs.
* `DeliveryDetailsModal.jsx`: Popup modal detailing address parts and order contents.

---

## 7. Pages Inventory

Page views containing forms, lists, modals, and report sheets.

### 7.1 Shared Public Pages
* `Login/Login.jsx`: Portal authorization screen.
* `Public/PublicReceipt.jsx`: Customer-facing web invoice displaying items and progress status.

### 7.2 Super Admin Pages (`Pages/superadmin/`)
* `DashboardOverview.jsx`: Consolidated branches summary, total global revenue, active order charts, and quick logs.
* `Users.jsx`: Global CRUD control over employees, role mapping, and employee locking/unlocking.
* `Branches.jsx`: Lists branch details.
* `AddBranch.jsx` / `EditBranch.jsx`: Create/edit form inputs for store branches.
* `Reports.jsx`: Financial reports covering revenue and order counts globally.
* `Settings.jsx`: Global profile editor and theme preferences.

### 7.3 Admin Pages (`Pages/admin/`)
* `DashboardOverview.jsx`: Revenue charts, recent logs feed, branch metrics.
* `Customers.jsx`: Complete directory of customer files, order history, and spent logs.
* `Orders.jsx`: Main order ledger showing tracking progress and status controls.
* `Invoices.jsx`: Central invoice repository.
* `MakeInvoice.jsx`: Standard order creator flow.
* `Services.jsx`: Laundry services list, pricing configuration, and active status switch.
* `PickupDelivery.jsx`: Dispatch coordinator page to assign riders to pickup and delivery jobs.
* `Drivers.jsx`: Driver directory, car numbers, status, and shift logs.
* `Payments.jsx`: Main payments list where admins can review payments and mark them paid.
* `Branches.jsx` / `AddBranch.jsx` / `EditBranch.jsx`: Manage branch structures.
* `Staff.jsx` / `AddStaff.jsx` / `EditStaff.jsx` / `StaffDetails.jsx`: Staff directory.
* `RolesPermissions.jsx`: Role matrix editor.
* `Reports.jsx`: Detailed reports covering branch financial metrics.
* `Settings.jsx`: Profile settings and preferences.
* `LcdDisplay.jsx`: TV dashboard showing order progress status.

### 7.4 Counter Staff Pages (`Pages/counter/`)
* `Dashboard.jsx`: Counter desk dashboard overview.
* `Customers.jsx`: Manage counter customers.
* `MakeInvoice.jsx`: Form to register walk-ins, garment counts, delivery scheduling, and discount parameters.
* `OrderList.jsx`: Search, filter, and track order states.
* `OrderTracking.jsx`: Visual representation of order workflow status.
* `Invoices.jsx`: Print, check status, or retrieve specific invoices.
* `Payments.jsx`: Log payments by Cash, Card, or UPI methods.
* `Settings.jsx`: Profile settings.

### 7.5 Delivery Staff Pages (`Pages/delivery/`)
* `Dashboard.jsx`: Stats for riders (pending runs, collections).
* `AssignedPickups.jsx`: Interactive map details, contact info, and status transitions for collections.
* `AssignedDeliveries.jsx`: Address detail cards and checkout confirmations for doorstep delivery.
* `CompletedJobs.jsx`: Detailed log of previous logistics runs.
* `Settings.jsx`: Profile settings.

---

## 8. Helper & Utility Scripts

Mathematical, formatting, and export logic.

* `utils/exportUtils.js`: Implements CSV generation and PDF layout formatting (using `jspdf` & `jspdf-autotable`).
* `utils/garmentPricing.js`: Standard pricing mappings for traditional and casual garments.
* `utils/garmentTranslations.js`: Translation dictionary mapping English garment terms to Arabic.
* `utils/orderUtils.js`: Utility helpers calculating tax brackets, order totals, and sub-sums.
* `utils/reportAnalytics.js`: Data aggregation pipelines for generating charts and statistical indexes.
