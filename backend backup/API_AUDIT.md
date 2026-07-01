# Backend API Audit Contract

This document specifies the exact API routes, request parameters, request body schemas, and response formats that the backend must implement to serve the frontend without modifications to the UI routing or response handling.

---

## 1. Authentication Services

### 1.1 User Login
* **Route**: `POST /api/auth/login`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Body**:
  ```json
  {
    "email": "admin@tuhama.com",
    "password": "admin123",
    "branchId": 1
  }
  ```
* **Expected Response (Success)**:
  ```json
  {
    "token": "JWT_TOKEN_STRING",
    "user": {
      "id": 1,
      "name": "Dana Lee",
      "email": "dana@tuhama.com",
      "role": "Admin",
      "branchId": 1,
      "branchName": "Ragheey"
    }
  }
  ```
* **Expected Response (Locked Account)**:
  ```json
  {
    "message": "Access denied. Your account is locked. Please contact the Super Admin."
  }
  ```
* **Frontend Component**: `src/Components/LoginForm.jsx`

### 1.2 Change Password
* **Route**: `POST /api/auth/change-password`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <token>`
* **Body**:
  ```json
  {
    "currentPassword": "admin123",
    "newPassword": "newpassword123"
  }
  ```
* **Expected Response (Success)**:
  ```json
  { "message": "Password changed successfully" }
  ```
* **Frontend Component**: `src/Pages/superadmin/Settings.jsx`, `src/Pages/admin/Settings.jsx`, `src/Pages/counter/Settings.jsx`, `src/Pages/delivery/Settings.jsx`

---

## 2. Branches API

### 2.1 Get All Branches
* **Route**: `GET /api/branches`
* **Method**: `GET`
* **Expected Response**:
  ```json
  [
    { "id": 1, "name": "Ragheey", "address": "Ragheey Area", "phone": "99999991", "manager": "Manager 1", "status": "Active" },
    { "id": 2, "name": "Mishrif", "address": "Mishrif Area", "phone": "99999992", "manager": "Manager 2", "status": "Active" }
  ]
  ```
* **Frontend Component**: `src/Pages/superadmin/Branches.jsx`

### 2.2 Add New Branch
* **Route**: `POST /api/branches`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "name": "Ardiya Branch",
    "address": "Ardiya Block 2 St 1",
    "phone": "99999994",
    "status": "Active"
  }
  ```
* **Expected Response**:
  ```json
  { "id": 4, "name": "Ardiya Branch", "address": "Ardiya Block 2 St 1", "phone": "99999994", "status": "Active" }
  ```
* **Frontend Component**: `src/Pages/superadmin/AddBranch.jsx`

---

## 3. Customers API

### 3.1 Get All Customers
* **Route**: `GET /api/customers`
* **Method**: `GET`
* **Expected Response**:
  ```json
  [
    {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "phone": "555-0101",
      "areaName": "Salmiya",
      "partNo": "1",
      "street": "Amman St",
      "jadda": "2",
      "houseNo": "45",
      "levelNo": "1",
      "flatNo": "2",
      "status": "Active",
      "totalSpent": 150.0,
      "loyaltyPoints": 15
    }
  ]
  ```
* **Frontend Component**: `src/Pages/admin/Customers.jsx`, `src/Pages/counter/Customers.jsx`

### 3.2 Add Customer
* **Route**: `POST /api/customers`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "name": "Dave Rogers",
    "phone": "555-0999",
    "areaName": "Hawally",
    "partNo": "3",
    "street": "Tunis St",
    "jadda": "",
    "houseNo": "10",
    "levelNo": "5",
    "flatNo": "20",
    "status": "Active"
  }
  ```
* **Expected Response**:
  ```json
  {
    "id": 31,
    "name": "Dave Rogers",
    "phone": "555-0999",
    "areaName": "Hawally",
    "partNo": "3",
    "street": "Tunis St",
    "status": "Active",
    "totalSpent": 0,
    "loyaltyPoints": 0
  }
  ```
* **Frontend Component**: `src/Pages/counter/MakeInvoice.jsx`

---

## 4. Orders API

### 4.1 Get Orders
* **Route**: `GET /api/orders`
* **Method**: `GET`
* **Query Params**: `branchId` (optional, filter by branch), `status` (optional, filter by status)
* **Expected Response**:
  ```json
  [
    {
      "id": 101,
      "number": "ORD-00101",
      "customerId": 1,
      "customerName": "Alice Johnson",
      "serviceType": "Wash & Fold",
      "status": "Waiting",
      "paymentStatus": "Pending",
      "amount": 15.0,
      "tax": 1.5,
      "totalAmount": 16.5,
      "date": "2026-06-05",
      "pickupDate": "2026-06-05",
      "deliveryDate": "2026-06-07",
      "notes": "",
      "createdBy": "Counter Staff",
      "branchId": 1,
      "itemDetails": [
        { "name": "Dishdasha", "quantity": 10, "unitPrice": 1.5 }
      ],
      "timeline": [
        { "status": "Waiting", "date": "06/05/2026", "time": "01:00 AM", "updatedBy": "Dana Lee" }
      ]
    }
  ]
  ```
* **Frontend Component**: `src/Pages/admin/Orders.jsx`, `src/Pages/counter/OrderList.jsx`

### 4.2 Create Order (Make Invoice)
* **Route**: `POST /api/orders`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "number": "ORD-00105",
    "customerId": 1,
    "customerName": "Alice Johnson",
    "serviceType": "Dry Cleaning",
    "amount": 10.0,
    "tax": 1.0,
    "totalAmount": 11.0,
    "date": "2026-06-25",
    "deliveryDate": "2026-06-27",
    "deliveryType": "Home Delivery",
    "notes": "Delicate handle",
    "itemDetails": [
      { "name": "Bisht", "quantity": 1, "unitPrice": 3.5 }
    ]
  }
  ```
* **Expected Response**:
  ```json
  { "id": 105, "number": "ORD-00105", "status": "Waiting", "deliveryStatus": "Scheduled" }
  ```
* **Frontend Component**: `src/Pages/counter/MakeInvoice.jsx`

### 4.3 Update Order Status
* **Route**: `PUT /api/orders/:id/status`
* **Method**: `PUT`
* **Body**:
  ```json
  {
    "status": "In Workshop",
    "holdComment": "Awaiting special chemical"
  }
  ```
* **Expected Response**:
  ```json
  { "id": 101, "status": "In Workshop", "timeline": [...] }
  ```
* **Frontend Component**: `src/Pages/admin/Orders.jsx`, `src/Pages/counter/OrderList.jsx`

---

## 5. Laundry Services API

### 5.1 Get Services Catalog
* **Route**: `GET /api/services`
* **Method**: `GET`
* **Expected Response**:
  ```json
  [
    { "id": 1, "name": "Wash & Fold", "category": "Washing", "price": 2.5, "estimatedTime": "24 hours", "status": "Active", "description": "Standard wash and fold" }
  ]
  ```
* **Frontend Component**: `src/Pages/admin/Services.jsx`

---

## 6. Staff & Driver API

### 6.1 Get Staff Directory
* **Route**: `GET /api/staff`
* **Method**: `GET`
* **Expected Response**:
  ```json
  [
    { "id": 4, "name": "Evan Wu", "email": "evan@tuhama.com", "role": "Counter Staff", "status": "Active", "joiningDate": "2024-04-05", "isLocked": false }
  ]
  ```
* **Frontend Component**: `src/Pages/admin/Staff.jsx`, `src/Pages/superadmin/Users.jsx`

### 6.2 Lock/Unlock Staff Account
* **Route**: `PUT /api/staff/:id/lock`
* **Method**: `PUT`
* **Body**:
  ```json
  { "isLocked": true }
  ```
* **Expected Response**:
  ```json
  { "id": 4, "isLocked": true, "status": "Suspended" }
  ```
* **Frontend Component**: `src/Pages/superadmin/Users.jsx`

### 6.3 Get Logistics Drivers
* **Route**: `GET /api/drivers`
* **Method**: `GET`
* **Expected Response**:
  ```json
  [
    { "id": 12, "driverNo": "DRV-100", "driverName": "Frank Brown", "carNo": "CAR-1000", "areas": ["Salmiya"], "status": "Available" }
  ]
  ```
* **Frontend Component**: `src/Pages/admin/Drivers.jsx`

---

## 7. Logistics (Pickups & Deliveries) API

### 7.1 Assign Dispatch Rider to Pickup Job
* **Route**: `PUT /api/pickups/:id/assign`
* **Method**: `PUT`
* **Body**:
  ```json
  { "assignedStaff": "Frank Brown" }
  ```
* **Expected Response**:
  ```json
  { "id": 1, "assignedStaff": "Frank Brown", "status": "Assigned" }
  ```
* **Frontend Component**: `src/Pages/admin/PickupDelivery.jsx`

### 7.2 Update Delivery Status
* **Route**: `PUT /api/deliveries/:id/status`
* **Method**: `PUT`
* **Body**:
  ```json
  { "status": "Delivered" }
  ```
* **Expected Response**:
  ```json
  { "id": 2, "status": "Delivered" }
  ```
* **Frontend Component**: `src/Pages/delivery/AssignedDeliveries.jsx`

---

## 8. Notifications API

### 8.1 Fetch Notifications Feed
* **Route**: `GET /api/notifications`
* **Method**: `GET`
* **Expected Response**:
  ```json
  [
    { "id": 1, "title": "New Order", "text": "New order #1024 placed", "time": "2026-06-25T11:00:00Z", "read": false, "type": "order" }
  ]
  ```
* **Frontend Component**: `src/Components/Navbar.jsx`

---

## 9. Settings API

### 9.1 Fetch Store Settings
* **Route**: `GET /api/settings`
* **Method**: `GET`
* **Expected Response**:
  ```json
  {
    "business": {
      "businessName": "Tuhama PRO",
      "address": "100 Executive Blvd, New York, NY 10001",
      "phone": "555-0001"
    },
    "system": {
      "currency": "KWD",
      "timezone": "Asia/Kuwait"
    }
  }
  ```
* **Frontend Component**: `src/context/SettingsContext.jsx`
