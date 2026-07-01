import React from 'react';
import ReusableTable from '../ReusableTable';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { paymentStatusStyles } from '../../constants/statusStyles';

const PaymentTable = ({ payments }) => {
  const columns = [
    { header: 'Payment ID', accessor: 'paymentId' },
    { header: 'Order Number', accessor: 'orderNumber' },
    { header: 'Customer', accessor: 'customerName' },
    {
      header: 'Amount',
      accessor: 'amount',
      format: (val) => formatCurrency(val),
    },
    { header: 'Payment Method', accessor: 'method' },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span className={paymentStatusStyles[row.status] || paymentStatusStyles.Pending}>{row.status}</span>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
      format: (val) => formatDate(val),
    },
  ];

  return <ReusableTable columns={columns} data={payments} />;
};

export default PaymentTable;
