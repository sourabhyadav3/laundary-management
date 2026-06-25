import React from 'react';
import { FiHome, FiPackage, FiTruck, FiCheckCircle, FiPlusCircle, FiList, FiUsers, FiMapPin, FiSettings } from 'react-icons/fi';
import RoleSidebar from './RoleSidebar';

const menuItems = [
  { label: 'Dashboard', icon: <FiHome />, to: '/delivery/dashboard', end: true, permission: 'view_dashboard' },
  { label: 'Make Invoice', icon: <FiPlusCircle />, to: '/delivery/make-invoice', permission: 'make_invoice' },
  { label: 'Home Services', icon: <FiTruck />, to: '/delivery/pickups', permission: 'view_logistics' },
  { label: 'Assigned Deliveries', icon: <FiPackage />, to: '/delivery/deliveries', permission: 'view_logistics' },
  { label: 'Completed Jobs', icon: <FiCheckCircle />, to: '/delivery/completed', permission: 'view_logistics' },
  { label: 'Order', icon: <FiList />, to: '/delivery/orders', permission: 'view_orders' },
  { label: 'Driver', icon: <FiUsers />, to: '/delivery/drivers', permission: 'view_logistics' },
  { label: 'Orders tracking', icon: <FiMapPin />, to: '/delivery/tracking', permission: 'view_orders' },
  { label: 'Settings', icon: <FiSettings />, to: '/delivery/settings' },
];

const DeliverySidebar = () => (
  <RoleSidebar
    menuItems={menuItems}
    roleLabel="Delivery operations"
    footerText={
      <>
        <p className="font-semibold text-primary">Route summary</p>
        <p className="mt-2">Pickups and deliveries assigned to you appear here in real time.</p>
      </>
    }
  />
);

export default DeliverySidebar;
