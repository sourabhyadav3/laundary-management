// // src/context/AdminStateContext.js
// import React, { createContext, useState } from 'react';
// import { mockCustomers, mockOrders, mockServices, mockStaff, mockPayments, mockPickups, mockDeliveries } from '../data/mockData';

// export const AdminStateContext = createContext();

// export const AdminStateProvider = ({ children }) => {
//   const [customers, setCustomers] = useState(mockCustomers);
//   const [orders, setOrders] = useState(mockOrders);
//   const [services, setServices] = useState(mockServices);
//   const [staff, setStaff] = useState(mockStaff);
//   const [payments, setPayments] = useState(mockPayments);
//   const [pickups, setPickups] = useState(mockPickups);
//   const [deliveries, setDeliveries] = useState(mockDeliveries);

//   // Simple helper functions (add, edit, delete) can be expanded later
//   const addCustomer = (customer) => setCustomers([...customers, { id: Date.now(), ...customer }]);
//   const addOrder = (order) => setOrders([...orders, { id: Date.now(), ...order }]);
//   const updateOrderStatus = (orderId, status) => {
//     setOrders(orders.map(o => (o.id === orderId ? { ...o, status } : o));
//   };

//   const value = {
//     customers,
//     addCustomer,
//     orders,
//     addOrder,
//     updateOrderStatus,
//     services,
//     setServices,
//     staff,
//     setStaff,
//     payments,
//     setPayments,
//     pickups,
//     setPickups,
//     deliveries,
//     setDeliveries,
//   };

//   return <AdminStateContext.Provider value={value}>{children}</AdminStateContext.Provider>;
// };
// src/context/AdminStateContext.js

import React, { createContext, useState } from 'react';
import {
  mockCustomers,
  mockOrders,
  mockServices,
  mockStaff,
  mockPayments,
  mockPickups,
  mockDeliveries,
  mockCompletedJobs,
  mockRoles,
} from '../data/mockData';
import { CUSTOMER_AREAS } from '../constants/areas';

export const GARMENT_CATALOG = [
  // Row 1
  { name: 'Dishdasha', key: 'dishdasha', price: 1.5, icon: '🥋', category: 'traditional' },
  { name: 'Dishdasha (Premium)', key: 'dishdashaPremium', price: 2.5, icon: '🥋', category: 'traditional' },
  { name: 'Small Dishdasha', key: 'smallDishdasha', price: 1.0, icon: '🥋', category: 'traditional' },
  { name: 'Small Dishdasha (Premium)', key: 'smallDishdashaPremium', price: 1.75, icon: '🥋', category: 'traditional' },
  { name: 'Ghotraa', key: 'ghotraa', price: 0.5, icon: '👳', category: 'traditional' },
  { name: 'Shmage', key: 'shmage', price: 0.75, icon: '🧣', category: 'traditional' },
  { name: 'Shmage (Special)', key: 'shmageSpecial', price: 1.25, icon: '🧣', category: 'traditional' },
  { name: 'Gahfiya', key: 'gahfiya', price: 0.25, icon: '🧢', category: 'traditional' },
  { name: 'Shirt', key: 'shirt', price: 0.75, icon: '👔', category: 'casual' },
  // Row 2
  { name: 'Bisht', key: 'bisht', price: 3.5, icon: '🧥', category: 'traditional' },
  { name: 'Trousers', key: 'trousers', price: 0.75, icon: '👖', category: 'casual' },
  { name: 'Jacket', key: 'jacket', price: 1.5, icon: '🧥', category: 'outerwear' },
  { name: 'BIG Jacket', key: 'bigJacket', price: 2.5, icon: '🧥', category: 'outerwear' },
  { name: 'Carpet', key: 'carpet', price: 5.0, icon: '🧹', category: 'household' },
  { name: 'Military Suit', key: 'militarySuit', price: 3.0, icon: '🎖️', category: 'casual' },
  { name: 'Cap', key: 'cap', price: 0.5, icon: '🧢', category: 'casual' },
  { name: 'Coat', key: 'coat', price: 2.0, icon: '🧥', category: 'outerwear' },
  { name: 'Suit', key: 'suit', price: 2.5, icon: '🤵', category: 'casual' },
  // Row 3
  { name: 'Small Trousers', key: 'smallTrousers', price: 0.5, icon: '👖', category: 'casual' },
  { name: 'Dress', key: 'dress', price: 1.5, icon: '👗', category: 'casual' },
  { name: 'School Dress', key: 'schoolDress', price: 1.0, icon: '👗', category: 'casual' },
  { name: 'Dressing Gown', key: 'dressingGown', price: 2.0, icon: '👘', category: 'casual' },
  { name: 'Evening Dress', key: 'eveningDress', price: 3.0, icon: '👗', category: 'casual' },
  { name: 'Wedding Dress', key: 'weddingDress', price: 15.0, icon: '👰', category: 'special' },
  { name: 'Large Blouse', key: 'largeBlouse', price: 1.25, icon: '👚', category: 'casual' },
  { name: 'Skirt', key: 'skirt', price: 1.0, icon: '👗', category: 'casual' },
  { name: 'Small Skirt', key: 'smallSkirt', price: 0.75, icon: '👗', category: 'casual' },
  // Row 4
  { name: 'Abaya', key: 'abaya', price: 2.0, icon: '🧕', category: 'traditional' },
  { name: 'Hegab', key: 'hegab', price: 0.5, icon: '🧕', category: 'traditional' },
  { name: 'Bluse', key: 'bluse', price: 1.0, icon: '👚', category: 'casual' },
  { name: 'OVERALL', key: 'overall', price: 2.0, icon: '🥋', category: 'casual' },
  { name: 'Curtain', key: 'curtain', price: 3.0, icon: '🪟', category: 'household' },
  { name: 'Sheet', key: 'sheet', price: 1.5, icon: '🛏️', category: 'household' },
  { name: 'Plaid', key: 'plaid', price: 2.5, icon: '🛏️', category: 'household' },
  { name: 'Single quilt', key: 'singleQuilt', price: 3.0, icon: '🛏️', category: 'household' },
  { name: 'Double quilt', key: 'doubleQuilt', price: 4.5, icon: '🛏️', category: 'household' },
];

const getCategoryColor = (category) => {
  switch (category) {
    case 'traditional': return '#8b5cf6'; // Purple
    case 'casual': return '#3b82f6';      // Blue
    case 'outerwear': return '#f59e0b';   // Amber
    case 'household': return '#10b981';   // Emerald
    case 'special': return '#ec4899';     // Pink
    default: return '#6b7280';            // Gray
  }
};

const INITIAL_CATALOG = GARMENT_CATALOG.map(item => ({
  ...item,
  color: item.color || getCategoryColor(item.category)
}));

export const AdminStateContext = createContext();

export const AdminStateProvider = ({ children }) => {
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('customers_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved customers", e);
      }
    }
    return mockCustomers;
  });

  React.useEffect(() => {
    localStorage.setItem('customers_list', JSON.stringify(customers));
  }, [customers]);

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('orders_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved orders", e);
      }
    }
    return mockOrders;
  });

  React.useEffect(() => {
    localStorage.setItem('orders_list', JSON.stringify(orders));
  }, [orders]);

  const [services, setServices] = useState(() => {
    const saved = localStorage.getItem('services_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved services", e);
      }
    }
    return mockServices;
  });

  React.useEffect(() => {
    localStorage.setItem('services_list', JSON.stringify(services));
  }, [services]);
  const [staff, setStaff] = useState(() => {
    const saved = localStorage.getItem('staff_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved staff", e);
      }
    }
    return mockStaff;
  });

  React.useEffect(() => {
    localStorage.setItem('staff_list', JSON.stringify(staff));
  }, [staff]);

  const [payments, setPayments] = useState(() => {
    const saved = localStorage.getItem('payments_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved payments", e);
      }
    }
    return mockPayments;
  });

  React.useEffect(() => {
    localStorage.setItem('payments_list', JSON.stringify(payments));
  }, [payments]);

  const [pickups, setPickups] = useState(() => {
    const saved = localStorage.getItem('pickups_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved pickups", e);
      }
    }
    return mockPickups;
  });

  React.useEffect(() => {
    localStorage.setItem('pickups_list', JSON.stringify(pickups));
  }, [pickups]);

  const [deliveries, setDeliveries] = useState(() => {
    const saved = localStorage.getItem('deliveries_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved deliveries", e);
      }
    }
    return mockDeliveries;
  });

  React.useEffect(() => {
    localStorage.setItem('deliveries_list', JSON.stringify(deliveries));
  }, [deliveries]);

  const [completedJobs, setCompletedJobs] = useState(() => {
    const saved = localStorage.getItem('completed_jobs_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved completed jobs", e);
      }
    }
    return mockCompletedJobs;
  });

  React.useEffect(() => {
    localStorage.setItem('completed_jobs_list', JSON.stringify(completedJobs));
  }, [completedJobs]);

  const [roles, setRoles] = useState(mockRoles);

  const [branches, setBranches] = useState(() => {
    const saved = localStorage.getItem('branches_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved branches", e);
      }
    }
    return [
      { id: 1, name: 'Ragheey', address: 'Ragheey Area', phone: '99999991', manager: 'Manager 1', status: 'Active' },
      { id: 2, name: 'Mishrif', address: 'Mishrif Area', phone: '99999992', manager: 'Manager 2', status: 'Active' },
      { id: 3, name: 'Andalus', address: 'Andalus Area', phone: '99999993', manager: 'Manager 3', status: 'Active' },
      { id: 4, name: 'Ardiya', address: 'Ardiya Area', phone: '99999994', manager: 'Manager 4', status: 'Active' },
      { id: 5, name: 'Khaitan', address: 'Khaitan Area', phone: '99999995', manager: 'Manager 5', status: 'Active' },
      { id: 6, name: 'Qurain', address: 'Qurain Area', phone: '99999996', manager: 'Manager 6', status: 'Active' },
      { id: 7, name: 'Jahra', address: 'Jahra Area', phone: '99999997', manager: 'Manager 7', status: 'Active' },
      { id: 8, name: 'Rigai', address: 'Rigai Area', phone: '99999998', manager: 'Manager 8', status: 'Active' },
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('branches_list', JSON.stringify(branches));
  }, [branches]);

  const [selectedBranch, setSelectedBranch] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.role !== 'Super Admin' && parsed.branchId) {
          const bId = parseInt(parsed.branchId, 10);
          if (!isNaN(bId)) return bId;
        }
      }
    } catch (e) {}

    const saved = localStorage.getItem('selected_branch');
    if (saved === 'All') return 'All';
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      return isNaN(parsed) ? 'All' : parsed;
    }
    return 'All';
  });

  React.useEffect(() => {
    localStorage.setItem('selected_branch', selectedBranch);
  }, [selectedBranch]);

  const [liveUpdateFilter, setLiveUpdateFilter] = useState('All Orders');

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }
    return [
      { id: 1, title: 'New Order', text: 'New order #1024 placed by Customer A', time: new Date(Date.now() - 5 * 60000).toISOString(), read: false, type: 'order' },
      { id: 2, title: 'Delivery Update', text: 'Driver Ahmed picked up Order #1021', time: new Date(Date.now() - 30 * 60000).toISOString(), read: false, type: 'delivery' },
      { id: 3, title: 'Inventory Alert', text: 'Low stock for Premium Detergent', time: new Date(Date.now() - 120 * 60000).toISOString(), read: true, type: 'system' }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('notifications_list', JSON.stringify(notifications));
  }, [notifications]);

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const addNotification = (notif) => {
    setNotifications(prev => [{ id: Date.now(), time: new Date().toISOString(), read: false, ...notif }, ...prev]);
  };

  const [drivers, setDrivers] = useState(() => {
    const saved = localStorage.getItem('drivers_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure areas array is present and statuses are mapped to new english keys
        const migrated = parsed.map((d, idx) => {
          let updated = { ...d };
          
          let rawAreas = updated.areas || (updated.area ? [updated.area] : []);
          if (typeof rawAreas === 'string') {
            rawAreas = [rawAreas];
          }
          
          updated.areas = rawAreas
            .flatMap(a => typeof a === 'string' ? a.split(',').map(s => s.trim()) : a)
            .filter(a => a && a !== '...' && a !== '…');
            
          if (updated.areas.length === 0) {
            updated.areas = [CUSTOMER_AREAS[idx % CUSTOMER_AREAS.length]];
          }

          if (updated.status === 'بالتوصيل' || updated.status === 'In Delivery') {
            updated.status = 'Available';
          } else if (updated.status === 'موقف' || updated.status === 'Suspended') {
            updated.status = 'Off Duty';
          } else if (updated.status === 'بالعمل' || updated.status === 'Working') {
            updated.status = 'Available';
          }
          return updated;
        });
        return migrated;
      } catch (e) {
        console.error("Failed to parse saved drivers", e);
      }
    }
    // Populate with mock Delivery Staff initially
    return mockStaff.filter(s => s.role === 'Delivery Staff').map((s, idx) => ({
      id: s.id,
      driverNo: `DRV-${100 + idx}`,
      driverName: s.name,
      mobile: s.phone || '99999999',
      tel: '22222222',
      areas: [CUSTOMER_AREAS[idx % CUSTOMER_AREAS.length]],
      street: 'Hamad Al-Mubarak St',
      part: '3',
      jadda: '1',
      houseNo: '12',
      floor: '2',
      flat: '4',
      addressNotes: 'Near police station',
      carNo: `CAR-${1000 + idx}`,
      civilId: `29402940${1000 + idx}`,
      nationality: 'Indian',
      branch: 'Ragheey',
      status: s.status === 'Active' ? 'Available' : 'Off Duty'
    }));
  });

  React.useEffect(() => {
    localStorage.setItem('drivers_list', JSON.stringify(drivers));
  }, [drivers]);
  
  const [catalog, setCatalog] = useState(() => {
    const saved = localStorage.getItem('garment_catalog');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved catalog", e);
      }
    }
    return INITIAL_CATALOG;
  });

  React.useEffect(() => {
    localStorage.setItem('garment_catalog', JSON.stringify(catalog));
  }, [catalog]);

  const nextId = (items) =>
    items.length ? Math.max(...items.map((item) => Number(item.id) || 0)) + 1 : 1;

  const addBranch = (branch) => {
    const id = branch.id ?? nextId(branches);
    setBranches([{ ...branch, id }, ...branches]);
  };

  const addCustomer = (customer) => {
    const id = customer.id ?? nextId(customers);
    setCustomers([{ ...customer, id }, ...customers]);
  };

  const addOrder = (order) => {
    const id = order.id ?? nextId(orders);
    const timestamp = new Date();
    const formattedDate = timestamp.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const formattedTime = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    let userStr = 'System';
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.name) {
          userStr = parsed.name;
        }
      }
    } catch (e) {}

    const initialTimeline = order.timeline || [
      {
        status: order.status || 'Waiting',
        date: formattedDate,
        time: formattedTime,
        updatedBy: userStr
      }
    ];

    const orderData = { ...order, id, deliveryStatus: order.deliveryStatus || order.status || 'Waiting', timeline: initialTimeline };
    setOrders([...orders, orderData]);

    // Create a delivery job automatically for Home Delivery invoices
    if (order.isHomeDelivery || order.deliveryType === 'Home Delivery') {
      const customerObj = customers.find((c) => c.id === order.customerId || c.name === order.customerName);
      
      let customerAddress = '';
      if (customerObj) {
        const addressParts = [
          customerObj.areaName ? `Area: ${customerObj.areaName}` : '',
          customerObj.partNo ? `Block: ${customerObj.partNo}` : '',
          customerObj.street ? `Street: ${customerObj.street}` : '',
          customerObj.jadda ? `Jadah: ${customerObj.jadda}` : '',
          customerObj.houseNo ? `House: ${customerObj.houseNo}` : '',
          customerObj.levelNo ? `F: ${customerObj.levelNo}` : '',
          customerObj.flatNo ? `Flat: ${customerObj.flatNo}` : '',
        ].filter(Boolean).join(', ');
        customerAddress = addressParts || customerObj.address || '';
      }

      const nextDeliveryId = deliveries.length ? Math.max(...deliveries.map(d => Number(d.id) || 0)) + 1 : 1;
      const deliveryId = `DEL-${String(nextDeliveryId).padStart(3, '0')}`;

      const newDelivery = {
        id: nextDeliveryId,
        deliveryId,
        customer: order.customerName,
        deliveryDate: order.deliveryDate || new Date().toISOString().split('T')[0],
        assignedStaff: '',
        orderCount: 1,
        status: 'Scheduled',
        address: customerAddress,
        contactNumber: customerObj?.phone || '555-0000',
        orderNumber: orderData.number,
        serviceType: order.serviceType || 'Wash & Fold',
        areaName: customerObj?.areaName || 'Salmiya',
        partNo: customerObj?.partNo || '',
        street: customerObj?.street || '',
        jadda: customerObj?.jadda || '',
        houseNo: customerObj?.houseNo || '',
        levelNo: customerObj?.levelNo || '',
        flatNo: customerObj?.flatNo || '',
        createdFromInvoice: true,
      };

      setDeliveries((prev) => [newDelivery, ...prev]);
    }
  };

  const addService = (service) => {
    const id = service.id ?? nextId(services);
    setServices([...services, { ...service, id }]);
  };

  const addStaff = (member) => {
    const id = member.id ?? nextId(staff);
    setStaff([
      ...staff,
      {
        ordersHandled: 0,
        deliveriesCompleted: 0,
        paymentsCollected: 0,
        recentActivity: 'Joined the team',
        joiningDate: new Date().toISOString().split('T')[0],
        ...member,
        id,
        name: member.name || member.fullName,
      },
    ]);
  };

  // Update Order Status
  const updateOrderStatus = (orderId, status, holdComment) => {
    const timestamp = new Date();
    const formattedDate = timestamp.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const formattedTime = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    let userStr = 'System';
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.name) {
          userStr = parsed.name;
        }
      }
    } catch (e) {}

    const newEntry = {
      status,
      date: formattedDate,
      time: formattedTime,
      updatedBy: userStr,
      ...(status === 'Hold' && holdComment != null && holdComment !== ''
        ? { comment: holdComment }
        : {}),
    };

    setOrders((prevOrders) =>
      prevOrders.map((o) => {
        if (o.id === orderId) {
          // If status becomes Delivered, also sync delivery status
          if (status === 'Delivered') {
            setTimeout(() => {
              setDeliveries(prevDels => prevDels.map(d => {
                if (d.orderNumber === o.number && d.status !== 'Delivered') {
                  return { ...d, status: 'Delivered' };
                }
                return d;
              }));
            }, 0);
          }
          const currentTimeline = o.timeline || [];
          if (currentTimeline.length > 0 && currentTimeline[currentTimeline.length - 1].status === status) {
            return {
              ...o,
              status,
              deliveryStatus: status,
              ...(status === 'Hold' && holdComment != null
                ? { holdComment }
                : {}),
            };
          }
          return {
            ...o,
            status,
            deliveryStatus: status,
            ...(status === 'Hold' && holdComment != null
              ? { holdComment }
              : {}),
            timeline: [...currentTimeline, newEntry],
          };
        }
        return o;
      })
    );
  };

  const updatePickupStatus = (pickupId, status) => {
    setPickups(prevPickups => {
      const target = prevPickups.find(p => p.id === pickupId);
      if (target && status === 'Completed' && target.assignedStaff) {
        setDrivers(prevDrivers => prevDrivers.map(d => {
          if (d.driverName === target.assignedStaff && d.status !== 'Off Duty') {
            return { ...d, status: 'Available' };
          }
          return d;
        }));
      }

      // Sync order status
      if (target && target.orderNumber && (status === 'Completed' || status === 'Picked Up')) {
        const ord = orders.find(o => o.number === target.orderNumber);
        if (ord) {
          setTimeout(() => {
            updateOrderStatus(ord.id, 'In Store');
          }, 0);
        }
      }

      return prevPickups.map((p) => (p.id === pickupId ? { ...p, status } : p));
    });
  };

  const updateDeliveryStatus = (deliveryId, status) => {
    setDeliveries(prevDeliveries => {
      const target = prevDeliveries.find(d => d.id === deliveryId);
      if (target && (status === 'Delivered' || status === 'Failed') && target.assignedStaff) {
        setDrivers(prevDrivers => prevDrivers.map(d => {
          if (d.driverName === target.assignedStaff && d.status !== 'Off Duty') {
            return { ...d, status: 'Available' };
          }
          return d;
        }));
      }

      // Sync order status
      if (target && target.orderNumber) {
        let orderStatus = '';
        if (status === 'Delivered') {
          orderStatus = 'Delivered';
        } else if (status === 'Out for Delivery') {
          orderStatus = 'With Driver';
        } else if (status === 'Failed') {
          orderStatus = 'Hold';
        }

        if (orderStatus) {
          const ord = orders.find(o => o.number === target.orderNumber);
          if (ord) {
            setTimeout(() => {
              updateOrderStatus(ord.id, orderStatus);
            }, 0);
          }
        }
      }

      return prevDeliveries.map((d) => (d.id === deliveryId ? { ...d, status } : d));
    });
  };

  const updateDeliveryJob = (updatedDelivery) => {
    setDeliveries(prevDeliveries => {
      const oldDelivery = prevDeliveries.find(d => d.id === updatedDelivery.id);
      if (oldDelivery && oldDelivery.assignedStaff !== updatedDelivery.assignedStaff) {
        if (oldDelivery.assignedStaff) {
          releaseDriver(oldDelivery.assignedStaff);
        }
        if (updatedDelivery.assignedStaff) {
          assignDriverToJob(updatedDelivery.assignedStaff, 'delivery');
        }
      }
      
      if (oldDelivery && oldDelivery.status !== updatedDelivery.status) {
        let orderStatus = '';
        if (updatedDelivery.status === 'Delivered') {
          orderStatus = 'Delivered';
        } else if (updatedDelivery.status === 'Out for Delivery') {
          orderStatus = 'With Driver';
        } else if (updatedDelivery.status === 'Failed') {
          orderStatus = 'Hold';
        }
        
        if (orderStatus && updatedDelivery.orderNumber) {
          const ord = orders.find(o => o.number === updatedDelivery.orderNumber);
          if (ord) {
            setTimeout(() => {
              updateOrderStatus(ord.id, orderStatus);
            }, 0);
          }
        }
      }

      return prevDeliveries.map(d => d.id === updatedDelivery.id ? updatedDelivery : d);
    });
  };

  const updatePickupJob = (updatedPickup) => {
    setPickups(prevPickups => {
      const oldPickup = prevPickups.find(p => p.id === updatedPickup.id);
      if (oldPickup && oldPickup.assignedStaff !== updatedPickup.assignedStaff) {
        if (oldPickup.assignedStaff) {
          releaseDriver(oldPickup.assignedStaff);
        }
        if (updatedPickup.assignedStaff) {
          assignDriverToJob(updatedPickup.assignedStaff, 'pickup');
        }
      }
      
      if (oldPickup && oldPickup.status !== updatedPickup.status) {
        if (updatedPickup.status === 'Completed' || updatedPickup.status === 'Picked Up') {
          if (updatedPickup.orderNumber) {
            const ord = orders.find(o => o.number === updatedPickup.orderNumber);
            if (ord) {
              setTimeout(() => {
                updateOrderStatus(ord.id, 'In Store');
              }, 0);
            }
          }
        }
      }

      return prevPickups.map(p => p.id === updatedPickup.id ? updatedPickup : p);
    });
  };

  const assignDriverToJob = (driverName, jobType) => {
    if (!driverName) return;
    setDrivers(prevDrivers => prevDrivers.map(d => {
      if (d.driverName === driverName && d.status !== 'Off Duty') {
        const nextStatus = jobType === 'delivery' ? 'On Delivery' : 'Assigned';
        return { ...d, status: nextStatus };
      }
      return d;
    }));
  };

  const releaseDriver = (driverName) => {
    if (!driverName) return;
    setDrivers(prevDrivers => prevDrivers.map(d => {
      if (d.driverName === driverName && d.status !== 'Off Duty') {
        return { ...d, status: 'Available' };
      }
      return d;
    }));
  };

  const addDriver = (driver) => {
    const id = driver.id ?? nextId(drivers);
    setDrivers([...drivers, { ...driver, id }]);
  };

  const updateDriver = (updatedDriver) => {
    setDrivers(drivers.map(d => d.id === updatedDriver.id ? updatedDriver : d));
  };

  const deleteDriver = (id) => {
    setDrivers(drivers.filter(d => d.id !== id));
  };

  const value = {
    customers,
    addCustomer,
    setCustomers,

    orders,
    addOrder,
    updateOrderStatus,
    setOrders,

    services,
    setServices,
    addService,

    staff,
    setStaff,
    addStaff,

    payments,
    setPayments,

    pickups,
    setPickups,
    updatePickupStatus,
    updatePickupJob,

    deliveries,
    setDeliveries,
    updateDeliveryStatus,
    updateDeliveryJob,

    drivers,
    setDrivers,
    addDriver,
    updateDriver,
    deleteDriver,
    assignDriverToJob,
    releaseDriver,

    completedJobs,
    setCompletedJobs,

    roles,
    setRoles,

    catalog,
    setCatalog,

    branches,
    setBranches,
    addBranch,

    selectedBranch,
    setSelectedBranch,

    liveUpdateFilter,
    setLiveUpdateFilter,

    notifications,
    setNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
    addNotification,
  };

  return (
    <AdminStateContext.Provider value={value}>
      {children}
    </AdminStateContext.Provider>
  );
};
