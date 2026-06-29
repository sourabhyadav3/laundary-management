import React, { useContext, useState, useMemo } from 'react';
import { FiSearch, FiEye, FiChevronDown, FiDownload, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import ReusableTable from '../../Components/ReusableTable';
import Modal from '../../Components/Modal';
import { toast } from 'react-toastify';
import { exportToCSV, formatCurrency, formatDate, generateInvoicePDF, cacheReceiptSnapshot } from '../../utils/exportUtils';
import { ORDER_STATUSES, paymentStatusStyles, getOrderStatusStyle, HOLD_STATUS } from '../../constants/statusStyles';

const statusOrder = ORDER_STATUSES;
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Partial'];

const Invoices = () => {
  const { orders, catalog, updateOrderStatus, updateOrderPaymentStatus, deleteOrder, selectedBranch, branches } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  
  const getBranchName = (branchIdOrName) => {
    if (!branchIdOrName) return 'Main Branch';
    const b = branches?.find((branch) => String(branch.id) === String(branchIdOrName) || branch.name === branchIdOrName);
    return b ? b.name : branchIdOrName;
  };
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const activeOrder = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find((o) => o.id === selectedOrder.id) || selectedOrder;
  }, [orders, selectedOrder]);

  const [showModal, setShowModal] = useState(false);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesBranch = !selectedBranch || selectedBranch === 'All' || !order.branchId || String(order.branchId) === String(selectedBranch) || String(order.branch) === String(selectedBranch);

        const matchesSearch =
          order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customerName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
        const matchesPayment = paymentFilter === 'All' || order.paymentStatus === paymentFilter;
        const isInvoice = order.number.includes('INV') || !order.number.includes('ORD');

        return matchesBranch && matchesSearch && matchesStatus && matchesPayment && isInvoice;
      })
      .sort((a, b) => {
        const numA = Number(a.id);
        const numB = Number(b.id);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [orders, searchTerm, statusFilter, paymentFilter, selectedBranch]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleUpdateStatus = (orderId, newStatus) => {
    let holdComment;
    if (newStatus === HOLD_STATUS) {
      holdComment = window.prompt('Hold comment / opinion:');
      if (holdComment === null) return;
      if (!holdComment.trim()) {
        toast.error('Please enter a hold comment / opinion');
        return;
      }
      holdComment = holdComment.trim();
    }
    updateOrderStatus(orderId, newStatus, holdComment);
    toast.success(`Invoice status updated to ${newStatus}`);
  };

  const handleUpdatePaymentStatus = async (orderId, newPaymentStatus) => {
    await updateOrderPaymentStatus(orderId, newPaymentStatus);
    setSelectedOrder((prev) => {
      if (!prev || prev.id !== orderId) return prev;
      const updated = { ...prev, paymentStatus: newPaymentStatus };
      cacheReceiptSnapshot(updated);
      return updated;
    });
  };

  const handlePrintInvoice = (order) => {
    generateInvoicePDF(order);
    toast.success('Invoice generated');
  };

  const handleDeleteOrder = (orderId) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      deleteOrder(orderId);
    }
  };

  const getRowStyle = (row) => {
    if (!row.itemDetails || row.itemDetails.length === 0) return {};
    const firstItem = row.itemDetails[0];
    const catalogItem = catalog?.find(
      (g) => g.name.toLowerCase() === firstItem.name.toLowerCase()
    );
    if (catalogItem && catalogItem.color) {
      const color = catalogItem.color;
      return {
        backgroundColor: `${color}30`,
        borderLeftColor: color,
      };
    }
    return {};
  };

  const tableColumns = [
    { header: 'Invoice #', accessor: 'number' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Branch', accessor: 'branchId', cell: (row) => getBranchName(row.branchId || row.branch) },
    { header: 'Service', accessor: 'serviceType' },
    {
      header: 'Items',
      accessor: 'itemDetails',
      cell: (row) => {
        if (!row.itemDetails || row.itemDetails.length === 0) return 'N/A';
        return (
          <div className="flex flex-col gap-1.5 py-1 text-[11px] font-semibold text-primary">
            {row.itemDetails.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-secondary">{item.name}</span>
                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded text-[9px] font-bold font-mono">
                  x{item.quantity}
                </span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <span className={`status-pill border ${getOrderStatusStyle(row.status)}`}>{row.status}</span>,
    },
    {
      header: 'Payment',
      accessor: 'paymentStatus',
      cell: (row) => <span className={`status-pill border ${paymentStatusStyles[row.paymentStatus] || paymentStatusStyles.Pending}`}>{row.paymentStatus}</span>,
    },
    { header: 'Amount', accessor: 'totalAmount', format: (val) => formatCurrency(val) },
    { header: 'Date', accessor: 'date', format: (val) => formatDate(val) },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewOrder(row)}
            className="icon-button-small text-blue-600"
            title="View Details"
          >
            <FiEye size={16} />
          </button>
          <button
            onClick={() => handleDeleteOrder(row.id)}
            className="icon-button-small text-rose-600"
            title="Delete Invoice"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="surface-card overflow-hidden border border-border shadow-xl rounded-2xl">
        <div className="dashboard-hero p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">Invoice Management</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">All Invoices</h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">Track and manage all customer invoices.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search invoice # or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="All">All Status</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>

        <div className="relative">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="All">All Payments</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>
      </div>

      {/* Export and Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-primary">Invoices List</h2>
          <p className="text-sm text-secondary">Total: {filteredOrders.length} invoices | Total Value: {formatCurrency(filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}</p>
        </div>
        <button
          onClick={() => exportToCSV(filteredOrders, 'invoices.csv')}
          className="action-button"
          title="Export to CSV"
        >
          <FiDownload size={16} />
          <span>Export</span>
        </button>
      </div>

      {/* Invoices Table */}
      <section className="surface-card border border-border rounded-2xl overflow-hidden">
        <ReusableTable columns={tableColumns} data={filteredOrders} getRowStyle={getRowStyle} />
      </section>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Invoice Details"
        size="2xl"
      >
        {activeOrder && (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary">{activeOrder.number}</h2>
                <p className="mt-1 text-sm text-secondary">{formatDate(activeOrder.date)}</p>
              </div>
              <span className={`status-pill border px-4 py-2 ${getOrderStatusStyle(activeOrder.status)}`}>
                {activeOrder.status}
              </span>
            </div>

            {/* Customer Info */}
            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">Customer Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Name</p>
                  <p className="mt-1 font-semibold text-primary">{activeOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary mb-1">Status</p>
                  <div className="relative">
                    <select
                      value={activeOrder.paymentStatus || 'Pending'}
                      onChange={(e) => handleUpdatePaymentStatus(activeOrder.id, e.target.value)}
                      className={`w-full appearance-none rounded-xl border py-2 px-3 pr-9 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 ${paymentStatusStyles[activeOrder.paymentStatus] || paymentStatusStyles.Pending}`}
                    >
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary" />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Staff Name</p>
                  <p className="mt-1 font-semibold text-primary">{activeOrder.staffName || activeOrder.createdBy || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">Invoice Items</h3>
              <div className="space-y-3">
                {activeOrder.itemDetails?.map((item, idx) => (
                  <div key={idx} className="flex justify-between rounded-lg bg-surface-alt p-3">
                    <span className="text-primary font-medium">{item.name}</span>
                    <span className="text-secondary">{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t border-border pt-6 bg-surface-alt p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-secondary">Subtotal:</span>
                  <span className="font-semibold text-primary">{formatCurrency(activeOrder.amount)}</span>
                </div>
                {activeOrder.discount > 0 && (
                  <div className="flex justify-between text-rose-500 font-semibold">
                    <span>Discount:</span>
                    <span>-{formatCurrency(activeOrder.discount)}</span>
                  </div>
                )}
                {activeOrder.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Tax:</span>
                    <span className="font-semibold text-primary">{formatCurrency(activeOrder.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-primary font-semibold">Total:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(activeOrder.paymentStatus === 'Paid' ? 0 : activeOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">Update Status</h3>
              <div className="relative inline-block w-full sm:w-64">
                <select
                  value={activeOrder.status}
                  onChange={(e) => handleUpdateStatus(activeOrder.id, e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-surface py-2.5 px-4 pr-10 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {statusOrder.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border pt-6 flex gap-3">
              <button
                onClick={() => handlePrintInvoice(activeOrder)}
                className="flex-1 rounded-lg border border-blue-500/30 bg-blue-500/10 py-2 font-semibold text-blue-600 transition hover:bg-blue-500/20 flex items-center justify-center gap-2"
              >
                <FiPrinter size={16} />
                Print Invoice
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-border bg-surface py-2 font-semibold text-primary transition hover:bg-surface-alt"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Invoices;
