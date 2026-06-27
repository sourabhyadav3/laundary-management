const fs = require('fs');
const path = require('path');

const applyMigration = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 1. Add api import
  if (!content.includes("import api from '../../utils/api'")) {
    content = content.replace("import { toast } from 'react-toastify';", "import { toast } from 'react-toastify';\nimport api from '../../utils/api';");
  }

  // 2. Add useEffect for dashboard metrics
  const stateHooksRegex = /const \[customSearch, setCustomSearch\] = useState\(''\);/g;
  const dashboardState = `const [customSearch, setCustomSearch] = useState('');
  
  const [dashboardData, setDashboardData] = useState({
    summary: { totalRevenue: 0, totalOrders: 0, completedOrders: 0, pendingOrders: 0, activeCustomers: 0, averageOrderValue: 0 },
    periodOrders: [],
    serviceRevenue: { washing: 0, dryCleaning: 0, ironing: 0, premium: 0 },
    paymentDistribution: { Cash: 0, Card: 0, Link: 0, Wamd: 0 },
    periodPayments: []
  });
  const [loadingDashboard, setLoadingDashboard] = useState(false);
`;
  content = content.replace(stateHooksRegex, dashboardState);

  // 3. Replace handleGenerateReport logic
  const handleGenerateRegex = /const handleGenerateReport = \(\) => {[\s\S]*?(?=const range = useMemo)/;
  const newHandleGenerate = `const handleGenerateReport = async () => {
    if (!stepCategory || !stepReportType) {
      toast.warning(language === 'ar' ? 'يرجى اختيار الفئة ونوع التقرير' : 'Please select a Category and Report Type');
      return;
    }

    const categoryObj = CATEGORIES.find(c => c.id === stepCategory);
    const reportTypeObj = REPORT_TYPES[stepCategory]?.find(r => r.id === stepReportType);
    const titleEn = \`\${categoryObj.label} - \${reportTypeObj.label}\`;
    const titleAr = \`\${categoryObj.labelAr} - \${reportTypeObj.labelAr}\`;
    const title = language === 'ar' ? titleAr : titleEn;

    let columns = [];
    
    switch (stepReportType) {
      case 'total_sales':
        columns = [
          { header: language === 'ar' ? 'التاريخ' : 'Date', accessor: 'date', format: (val) => formatDate(val) },
          { header: language === 'ar' ? 'عدد الطلبات' : 'Order Count', accessor: 'count' },
          { header: language === 'ar' ? 'المجموع الفرعي' : 'Subtotal', accessor: 'subtotal', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'الخصم' : 'Discount', accessor: 'discount', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'الضريبة' : 'Tax', accessor: 'tax', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'الإجمالي الصافي' : 'Net Total', accessor: 'total', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'sales_detail':
        columns = [
          { header: language === 'ar' ? 'رقم الفاتورة' : 'Order #', accessor: 'orderNo' },
          { header: language === 'ar' ? 'العميل' : 'Customer', accessor: 'customerName' },
          { header: language === 'ar' ? 'التاريخ' : 'Date', accessor: 'date', format: (val) => formatDate(val) },
          { header: language === 'ar' ? 'الصنف' : 'Item Name', accessor: 'itemName' },
          { header: language === 'ar' ? 'الخدمة' : 'Service Type', accessor: 'service' },
          { header: language === 'ar' ? 'الكمية' : 'Qty', accessor: 'qty' },
          { header: language === 'ar' ? 'سعر الوحدة' : 'Unit Price', accessor: 'price', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'الإجمالي' : 'Total', accessor: 'total', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'branch_sales':
        columns = [
          { header: language === 'ar' ? 'الفرع' : 'Branch Name', accessor: 'branch' },
          { header: language === 'ar' ? 'عدد الطلبات' : 'Order Count', accessor: 'count' },
          { header: language === 'ar' ? 'مجموع المبيعات' : 'Sales Revenue', accessor: 'revenue', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value', accessor: 'avgValue', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'payment_methods':
        columns = [
          { header: language === 'ar' ? 'طريقة الدفع' : 'Payment Method', accessor: 'method' },
          { header: language === 'ar' ? 'عدد العمليات' : 'Transactions', accessor: 'count' },
          { header: language === 'ar' ? 'المبلغ المحصل' : 'Collected Amount', accessor: 'collected', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'customer_list':
        columns = [
          { header: language === 'ar' ? 'رقم العميل' : 'Customer ID', accessor: 'customerId' },
          { header: language === 'ar' ? 'الاسم' : 'Name', accessor: 'name' },
          { header: language === 'ar' ? 'الهاتف' : 'Phone', accessor: 'phone' },
          { header: language === 'ar' ? 'تاريخ التسجيل' : 'Registered', accessor: 'registered', format: (val) => formatDate(val) },
          { header: language === 'ar' ? 'الخصم الدائم' : 'Discount', accessor: 'discount', format: (val) => val ? \`\${val}%\` : '0%' },
          { header: language === 'ar' ? 'عدد الطلبات' : 'Total Orders', accessor: 'ordersCount' },
          { header: language === 'ar' ? 'الرصيد المستحق' : 'Due Balance', accessor: 'balance', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'top_customers':
        columns = [
          { header: language === 'ar' ? 'اسم العميل' : 'Customer Name', accessor: 'name' },
          { header: language === 'ar' ? 'عدد الطلبات في الفترة' : 'Orders Count', accessor: 'ordersCount' },
          { header: language === 'ar' ? 'إجمالي المبيعات' : 'Total Spent', accessor: 'spent', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'آخر تاريخ طلب' : 'Last Order Date', accessor: 'lastDate', format: (val) => formatDate(val) },
        ];
        break;
      case 'customer_debts':
        columns = [
          { header: language === 'ar' ? 'الاسم' : 'Customer Name', accessor: 'name' },
          { header: language === 'ar' ? 'الهاتف' : 'Phone', accessor: 'phone' },
          { header: language === 'ar' ? 'تاريخ التسجيل' : 'Registered', accessor: 'registered', format: (val) => formatDate(val) },
          { header: language === 'ar' ? 'الرصيد المستحق' : 'Due Balance', accessor: 'balance', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'completed_jobs':
      case 'pending_jobs':
        columns = [
          { header: language === 'ar' ? 'رقم الطلب' : 'Request ID', accessor: 'reqId' },
          { header: language === 'ar' ? 'النوع' : 'Type', accessor: 'type' },
          { header: language === 'ar' ? 'العميل' : 'Customer', accessor: 'customer' },
          { header: language === 'ar' ? 'التاريخ' : 'Date', accessor: 'date', format: (val) => formatDate(val) },
          { header: language === 'ar' ? 'المندوب' : 'Driver', accessor: 'driver' },
          { header: language === 'ar' ? 'الحالة' : 'Status', accessor: 'status' },
        ];
        break;
      case 'user_sales':
        columns = [
          { header: language === 'ar' ? 'الموظف' : 'Employee Name', accessor: 'name' },
          { header: language === 'ar' ? 'عدد الفواتير' : 'Invoices Count', accessor: 'count' },
          { header: language === 'ar' ? 'إجمالي المبيعات' : 'Sales Generated', accessor: 'sales', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'driver_income':
        columns = [
          { header: language === 'ar' ? 'السائق' : 'Driver Name', accessor: 'name' },
          { header: language === 'ar' ? 'المناطق المغطاة' : 'Assigned Areas', accessor: 'areas' },
          { 
            header: language === 'ar' ? 'الحالة الحالية' : 'Current Status', 
            accessor: 'status',
            format: (status) => {
              const colors = {
                'Available': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
                'Assigned': 'bg-amber-500/10 text-amber-600 border-amber-500/15',
                'On Delivery': 'bg-blue-500/10 text-blue-600 border-blue-500/15',
                'Off Duty': 'bg-rose-500/10 text-rose-600 border-rose-500/15'
              };
              return (
                '<span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${colors[status] || colors.Available}`}>' +
                  status +
                '</span>'
              );
            }
          },
          { header: language === 'ar' ? 'عمليات بيك اب نشطة' : 'Active Pickups', accessor: 'activePickups' },
          { header: language === 'ar' ? 'عمليات توصيل نشطة' : 'Active Deliveries', accessor: 'activeDeliveries' },
        ];
        break;
      case 'service_revenue':
        columns = [
          { header: language === 'ar' ? 'الخدمة' : 'Service Type', accessor: 'service' },
          { header: language === 'ar' ? 'عدد الطلبات' : 'Order Count', accessor: 'count' },
          { header: language === 'ar' ? 'مجموع الإيرادات' : 'Revenue', accessor: 'revenue', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'garment_stats':
        columns = [
          { header: language === 'ar' ? 'الصنف' : 'Garment Name', accessor: 'name' },
          { header: language === 'ar' ? 'الكمية الإجمالية' : 'Units Sold', accessor: 'qty' },
          { header: language === 'ar' ? 'إجمالي المبيعات' : 'Revenue', accessor: 'revenue', format: (val) => formatCurrency(val) },
        ];
        break;
      default: break;
    }

    try {
      const { start, end } = getDateRange(datePreset, customStart, customEnd);
      let sStr = '';
      let eStr = '';
      if(start) sStr = start.toISOString().slice(0, 10);
      if(end) eStr = end.toISOString().slice(0, 10);
      
      const res = await api.get('/reports/generate', {
         params: { reportType: stepReportType, category: stepCategory, parameter: stepParameter, start: sStr, end: eStr }
      });
      setCustomReport({ title, columns, data: res.data.data });
      toast.success(language === 'ar' ? 'تم إنشاء التقرير بنجاح' : 'Report generated successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate report');
    }
  };

`;
  content = content.replace(handleGenerateRegex, newHandleGenerate);

  // 4. Replace metrics calculations
  const metricsRegex = /const metrics = useMemo\([\s\S]*?\[orders, customers, payments, pickups, deliveries, staff, range\]\n  \);/;
  const newMetrics = `
  React.useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoadingDashboard(true);
        const { start, end } = getDateRange(datePreset, customStart, customEnd);
        let sStr = '';
        let eStr = '';
        if(start) sStr = start.toISOString().slice(0, 10);
        if(end) eStr = end.toISOString().slice(0, 10);
        
        const res = await api.get('/reports/dashboard', { params: { start: sStr, end: eStr } });
        setDashboardData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDashboard(false);
      }
    };
    fetchDashboard();
  }, [datePreset, customStart, customEnd]);

  const metrics = dashboardData;
`;
  content = content.replace(metricsRegex, newMetrics);

  fs.writeFileSync(filePath, content);
};

applyMigration(path.resolve(__dirname, 'frontend/src/Pages/admin/Reports.jsx'));
applyMigration(path.resolve(__dirname, 'frontend/src/Pages/superadmin/Reports.jsx'));
console.log('Migration completed');
