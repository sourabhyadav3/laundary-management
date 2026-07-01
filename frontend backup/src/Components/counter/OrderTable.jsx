import React, { useContext } from 'react';
import { FiEye, FiRefreshCw } from 'react-icons/fi';
import ReusableTable from '../ReusableTable';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { getOrderStatusStyle, paymentStatusStyles } from '../../constants/statusStyles';
import { AdminStateContext } from '../../context/AdminStateContext';

const OrderTable = ({ orders, onView, onUpdateStatus }) => {
  const { catalog, branches } = useContext(AdminStateContext);

  const getBranchName = (branchIdOrName) => {
    if (!branchIdOrName) return 'Main Branch';
    const b = branches?.find((branch) => String(branch.id) === String(branchIdOrName) || branch.name === branchIdOrName);
    return b ? b.name : branchIdOrName;
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
        backgroundColor: `${color}30`, // darker/more visible background opacity
        borderLeftColor: color,
      };
    }
    return {};
  };
  const columns = [
    { header: 'Order Number', accessor: 'number' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Branch', accessor: 'branchId', cell: (row) => getBranchName(row.branchId || row.branch) },
    { header: 'Service', accessor: 'serviceType' },
    {
      header: 'Amount',
      accessor: 'totalAmount',
      format: (val) => formatCurrency(val),
    },
    {
      header: 'Payment Status',
      accessor: 'paymentStatus',
      cell: (row) => (
        <span className={paymentStatusStyles[row.paymentStatus] || paymentStatusStyles.Pending}>
          {row.paymentStatus}
        </span>
      ),
    },
    {
      header: 'Order Status',
      accessor: 'status',
      cell: (row) => (
        <span className={getOrderStatusStyle(row.status)}>{row.status}</span>
      ),
    },
    {
      header: 'Delivery Date',
      accessor: 'deliveryDate',
      format: (val) => formatDate(val),
    },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button type="button" className="icon-button-small" onClick={() => onView(row)} aria-label="View">
            <FiEye size={16} />
          </button>
          <button
            type="button"
            className="icon-button-small"
            onClick={() => onUpdateStatus(row)}
            aria-label="Update status"
          >
            <FiRefreshCw size={16} />
          </button>
        </div>
      ),
    },
  ];

  return <ReusableTable columns={columns} data={orders} getRowStyle={getRowStyle} />;
};

export default OrderTable;
