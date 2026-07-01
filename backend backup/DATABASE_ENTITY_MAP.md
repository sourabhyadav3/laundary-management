# Database Entity Map (MongoDB & Mongoose Schemas)

This document details the MongoDB collection structures, Mongoose schemas, ObjectId referencing, indexes, and document embedding design inferred from the Tuhama PRO React frontend.

---

## 1. Branches Collection (`branches`)
Stores physical laundry branch locations.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    manager: { type: String },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    createdAt: Date,
    updatedAt: Date
  }
  ```
* **Indexes**: 
  - `{ name: 1 }` (Unique)

---

## 2. Roles Collection (`roles`)
Stores role definitions with associated array of permissions strings.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    name: { type: String, required: true, unique: true }, // 'Admin', 'Counter Staff', 'Delivery Staff', 'Super Admin'
    description: { type: String },
    permissions: [{ type: String }] // Array of permission strings e.g. ["make_invoice", "view_dashboard"]
  }
  ```

---

## 3. Users / Staff Collection (`users`)
Stores both administrators, counter operators, and logistics delivery staff accounts.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: String },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: ObjectId, ref: 'roles', required: true },
    branch: { type: ObjectId, ref: 'branches' }, // Nullable for Super Admin
    status: { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
    isLocked: { type: Boolean, default: false },
    joiningDate: { type: Date, default: Date.now },
    ordersHandled: { type: Number, default: 0 },
    deliveriesCompleted: { type: Number, default: 0 },
    paymentsCollected: { type: Number, default: 0 },
    recentActivity: { type: String },
    createdAt: Date,
    updatedAt: Date
  }
  ```
* **Indexes**:
  - `{ email: 1 }` (Unique)
  - `{ username: 1 }` (Unique)

---

## 4. Customers Collection (`customers`)
Stores files for walk-in and registered customers.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true, unique: true },
    areaName: { type: String, required: true },
    partNo: { type: String },
    street: { type: String },
    jadda: { type: String },
    houseNo: { type: String },
    levelNo: { type: String },
    flatNo: { type: String },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    totalSpent: { type: Number, default: 0.0 },
    loyaltyPoints: { type: Number, default: 0 },
    createdAt: Date,
    updatedAt: Date
  }
  ```
* **Indexes**:
  - `{ phone: 1 }` (Unique Index)

---

## 5. Laundry Services Collection (`laundryservices`)
Stores catalog configurations for laundry washing, dry cleaning, and pressing options.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    name: { type: String, required: true, unique: true }, // e.g. "Wash & Fold", "Dry Cleaning"
    category: { type: String, required: true }, // e.g. "Washing", "Dry Cleaning"
    price: { type: Number, required: true },
    estimatedTime: { type: String, required: true }, // e.g., "24 hours"
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    description: { type: String },
    createdAt: Date,
    updatedAt: Date
  }
  ```

---

## 6. Orders Collection (`orders`)
Central order tracking. Includes embedded sub-schemas for items and timelines.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    number: { type: String, required: true, unique: true }, // e.g., "ORD-00101"
    customer: { type: ObjectId, ref: 'customers', required: true },
    customerName: { type: String, required: true },
    serviceType: { type: String, required: true }, // e.g., "Wash & Fold"
    status: { type: String, enum: ['Waiting', 'In Store', 'In Workshop', 'Ready', 'Delivered', 'Cancelled', 'Hold'], default: 'Waiting' },
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Partial', 'Overdue'], default: 'Pending' },
    amount: { type: Number, required: true }, // Subtotal before tax/discount
    tax: { type: Number, required: true },
    totalAmount: { type: Number, required: true }, // Final balance
    discountAmount: { type: Number, default: 0.0 },
    date: { type: String, required: true }, // e.g. "2026-06-05"
    pickupDate: { type: String },
    deliveryDate: { type: String },
    deliveryType: { type: String, enum: ['Branch Pickup', 'Home Delivery'], default: 'Branch Pickup' },
    notes: { type: String },
    createdBy: { type: String, required: true }, // Staff name or "System"
    branchId: { type: ObjectId, ref: 'branches', required: true },
    
    // Embedded Order Items array
    itemDetails: [{
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      modifiers: { type: String }
    }],
    
    // Embedded Timeline updates array
    timeline: [{
      status: { type: String, required: true },
      date: { type: String, required: true },
      time: { type: String, required: true },
      updatedBy: { type: String, required: true },
      comment: { type: String } // Used for hold reason comments
    }],
    
    createdAt: { type: Date, default: Date.now }
  }
  ```
* **Indexes**:
  - `{ number: 1 }` (Unique Index)
  - `{ branchId: 1 }`
  - `{ status: 1 }`

---

## 7. Payments Collection (`payments`)
Logs cash, card, and digital checkout registers.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    paymentId: { type: String, required: true, unique: true }, // e.g., "PAY-0001"
    order: { type: ObjectId, ref: 'orders', required: true },
    orderNumber: { type: String, required: true },
    customerName: { type: String, required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['Cash', 'Card', 'UPI', 'Pending'], default: 'Pending' },
    status: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
  }
  ```
* **Indexes**:
  - `{ paymentId: 1 }` (Unique Index)
  - `{ order: 1 }`

---

## 8. Drivers Collection (`drivers`)
Logistics details linked to delivery riders.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    user: { type: ObjectId, ref: 'users', required: true }, // Links to Users table
    driverNo: { type: String, required: true, unique: true }, // e.g., "DRV-101"
    driverName: { type: String, required: true },
    mobile: { type: String, required: true },
    tel: { type: String },
    areas: [{ type: String }], // Array of strings e.g. ["Salmiya", "Ragheey"]
    street: { type: String },
    part: { type: String },
    jadda: { type: String },
    houseNo: { type: String },
    floor: { type: String },
    flat: { type: String },
    addressNotes: { type: String },
    carNo: { type: String, required: true },
    civilId: { type: String, required: true },
    nationality: { type: String, required: true },
    branch: { type: String, required: true }, // e.g. "Ragheey"
    status: { type: String, enum: ['Available', 'Off Duty', 'On Delivery', 'Assigned'], default: 'Available' },
    createdAt: Date,
    updatedAt: Date
  }
  ```
* **Indexes**:
  - `{ driverNo: 1 }` (Unique Index)

---

## 9. Pickups Collection (`pickups`)
Rider collection assignments.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    pickupId: { type: String, required: true, unique: true }, // e.g., "PKP-001"
    customer: { type: String, required: true },
    pickupDate: { type: String, required: true },
    assignedStaff: { type: String }, // Driver name
    orderCount: { type: Number, default: 1 },
    status: { type: String, enum: ['Scheduled', 'Assigned', 'Picked Up', 'Completed'], default: 'Scheduled' },
    address: { type: String },
    contactNumber: { type: String },
    orderNumber: { type: String },
    areaName: { type: String },
    createdAt: { type: Date, default: Date.now }
  }
  ```
* **Indexes**:
  - `{ pickupId: 1 }` (Unique Index)

---

## 10. Deliveries Collection (`deliveries`)
Rider drop-off tasks.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    deliveryId: { type: String, required: true, unique: true }, // e.g., "DEL-001"
    customer: { type: String, required: true },
    deliveryDate: { type: String, required: true },
    assignedStaff: { type: String }, // Driver name
    orderCount: { type: Number, default: 1 },
    status: { type: String, enum: ['Scheduled', 'Assigned', 'Out for Delivery', 'Delivered', 'Failed'], default: 'Scheduled' },
    address: { type: String },
    contactNumber: { type: String },
    orderNumber: { type: String, required: true },
    areaName: { type: String },
    createdAt: { type: Date, default: Date.now }
  }
  ```
* **Indexes**:
  - `{ deliveryId: 1 }` (Unique Index)
  - `{ orderNumber: 1 }`

---

## 11. Settings Collection (`settings`)
Global turnarounds, tax metrics, and metadata details.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    key: { type: String, default: 'spinclean-settings', unique: true },
    business: {
      businessName: { type: String, default: 'Tuhama PRO' },
      ownerName: { type: String, default: 'Dana Lee' },
      email: { type: String, default: 'admin@tuhama.com' },
      phone: { type: String, default: '555-0001' },
      address: { type: String, default: '100 Executive Blvd, New York, NY 10001' },
      gstNumber: { type: String, default: 'GST-29ABCDE1234F1Z5' },
      website: { type: String, default: 'https://tuhama.com' },
      logo: { type: String }
    },
    system: {
      currency: { type: String, default: 'KWD' },
      timezone: { type: String, default: 'Asia/Kuwait' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
      defaultDeliveryTime: { type: String, default: '48 hours' }
    },
    notifications: {
      emailAlerts: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: false },
      orderUpdates: { type: Boolean, default: true },
      paymentReminders: { type: Boolean, default: true },
      pickupDeliveryAlerts: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false }
    },
    security: {
      twoFactorAuth: { type: Boolean, default: false },
      sessionTimeout: { type: String, default: '30' },
      loginAlerts: { type: Boolean, default: true }
    },
    payment: {
      upiQrCode: { type: String }
    }
  }
  ```

---

## 12. Refresh Tokens Collection (`refreshtokens`)
Used for maintaining secure JWT sessions without cookies/redis.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    user: { type: ObjectId, ref: 'users', required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true }
  }
  ```
* **Indexes**:
  - `{ token: 1 }` (Unique Index)
  - `{ expiresAt: 1 }` (TTL Index, automatically clean expired sessions)

---

## 13. Activity Logs Collection (`activitylogs`)
Stores operational records for auditing.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    user: { type: ObjectId, ref: 'users', required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "Login", "Create Order"
    details: { type: mongoose.Schema.Types.Mixed }, // Arbitrary JSON payload
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now }
  }
  ```

---

## 14. Notifications Collection (`notifications`)
Stores bell feed updates.

* **Schema**:
  ```javascript
  {
    _id: ObjectId,
    title: { type: String, required: true },
    text: { type: String, required: true },
    time: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    type: { type: String, enum: ['order', 'delivery', 'system', 'general'], default: 'general' }
  }
  ```
