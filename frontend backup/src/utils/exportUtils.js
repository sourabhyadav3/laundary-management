import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { translations } from '../context/translations';

export const formatCurrency = (value) => {
  const num = Number(value) || 0;
  let currency = 'KWD';
  try {
    const stored = localStorage.getItem('spinclean-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.system?.currency) {
        currency = parsed.system.currency;
      }
    }
  } catch (e) {
    // fallback
  }

  const lang = localStorage.getItem('language') || 'en';

  if (currency === 'KWD') {
    if (lang === 'ar') {
      return `${num.toFixed(3)} د.ك`;
    }
    return `KWD ${num.toFixed(3)}`;
  }

  if (lang === 'ar') {
    return `${num.toFixed(2)} ${currency}`;
  }
  return `${currency} ${num.toFixed(2)}`;
};

export const formatDate = (value) => {
  if (!value) return 'N/A';
  let timezone = undefined;
  let dateFormat = 'DD/MM/YYYY';
  try {
    const stored = localStorage.getItem('spinclean-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.system?.timezone) {
        timezone = parsed.system.timezone;
      }
      if (parsed.system?.dateFormat) {
        dateFormat = parsed.system.dateFormat;
      }
    }
  } catch {}

  const d = new Date(value);
  try {
    const options = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(d);
    
    const partMap = {};
    parts.forEach(p => {
      if (p.type !== 'literal') {
        partMap[p.type] = p.value;
      }
    });

    const day = partMap.day;
    const month = partMap.month;
    const year = partMap.year;

    if (dateFormat === 'DD/MM/YYYY') {
      return `${day}/${month}/${year}`;
    } else if (dateFormat === 'YYYY-MM-DD') {
      return `${year}-${month}-${day}`;
    } else {
      return `${month}/${day}/${year}`;
    }
  } catch (e) {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
};

export const formatDateTime = (value) => {
  if (!value) return 'N/A';
  let timezone = undefined;
  try {
    const stored = localStorage.getItem('spinclean-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.system?.timezone) {
        timezone = parsed.system.timezone;
      }
    }
  } catch {}

  return new Date(value).toLocaleString('en-US', {
    timeZone: timezone,
  });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const escapeCsvCell = (value) => {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const getCellValue = (row, col) => {
  const raw = row[col.key];
  if (col.format) return col.format(raw, row);
  return raw ?? '';
};

/** @returns {boolean} success */
export const exportToCSV = (data, filename, columns) => {
  if (!data?.length) return false;

  const cols =
    columns ||
    Object.keys(data[0]).map((key) => ({ key, label: key }));

  const headerLine = cols.map((c) => escapeCsvCell(c.label)).join(',');
  const bodyLines = data.map((row) =>
    cols.map((c) => escapeCsvCell(getCellValue(row, c))).join(',')
  );
  const csv = [headerLine, ...bodyLines].join('\r\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  return true;
};

export const exportToJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
  return true;
};

/**
 * @param {Object} options
 * @param {string} options.title
 * @param {string} [options.subtitle]
 * @param {Array<{key:string, label:string, format?:Function}>} options.columns
 * @param {Array} options.data
 * @param {string} options.filename
 * @param {string[]} [options.summaryLines]
 */
export const exportToPDF = ({ title, subtitle, columns, data, filename, summaryLines = [] }) => {
  if (!data?.length) return false;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);

  if (subtitle) {
    doc.text(subtitle, 14, y);
    y += 6;
  }

  doc.text(`Generated: ${formatDateTime(new Date())}`, 14, y);
  y += 6;
  doc.text(`Records: ${data.length}`, 14, y);
  y += 8;

  doc.setTextColor(40);

  if (summaryLines.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Summary', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    summaryLines.forEach((line) => {
      doc.text(line, 14, y);
      y += 5;
    });
    y += 4;
  }

  const head = [columns.map((c) => c.label)];
  const body = data.map((row) =>
    columns.map((c) => {
      const val = getCellValue(row, c);
      return typeof val === 'string' ? val : String(val);
    })
  );

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        'Tuhama PRO — Confidential',
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(safeName);
  return true;
};

const translateService = (service) => {
  const s = String(service || 'Iron & Wash').trim();
  const lower = s.toLowerCase();
  if (lower === 'express iron & wash') return { en: 'Express Iron & Wash', ar: 'غسيل وكوي مستعجل' };
  if (lower === 'iron & wash' || lower === 'normal' || lower === 'normal service') return { en: 'Iron & Wash', ar: 'غسيل وكوي عادي' };
  if (lower === 'express iron') return { en: 'Express Iron', ar: 'كوي مستعجل' };
  if (lower === 'iron only' || lower === 'iron only service') return { en: 'Iron Only', ar: 'كوي عادي' };
  if (lower === 'dry cleaning' || lower === 'dry cleaning only' || lower === 'dry clean service') return { en: 'Dry Cleaning Only', ar: 'غسيل جاف فقط' };
  if (lower === 'urgent' || lower === 'express') return { en: 'Express', ar: 'مستعجل / ممتاز' };
  if (lower === 'express wash' || lower === 'express wash service') return { en: 'Express Wash', ar: 'غسيل مستعجل' };
  return { en: s, ar: s };
};

const translateBranch = (branchIdOrName) => {
  if (!branchIdOrName) return { en: 'Main Branch', ar: 'الفرع الرئيسي' };
  const rawId = String(branchIdOrName).trim();
  const name = rawId.toLowerCase();

  // 1. Try to find in localStorage cached branches
  try {
    const cached = localStorage.getItem('branches_list');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const found = list.find(b => 
          String(b.id || b._id || '').toLowerCase() === name ||
          String(b.name || '').toLowerCase() === name
        );
        if (found) {
          const nameLower = String(found.name).toLowerCase();
          if (nameLower.includes('ragheey') || nameLower.includes('rigai')) {
            return { en: found.name, ar: 'الرقعي' };
          }
          if (nameLower.includes('mishrif')) {
            return { en: found.name, ar: 'مشرف' };
          }
          if (nameLower.includes('andalus')) {
            return { en: found.name, ar: 'الأندلس' };
          }
          if (nameLower.includes('ardiya')) {
            return { en: found.name, ar: 'العارضية' };
          }
          if (nameLower.includes('khaitan')) {
            return { en: found.name, ar: 'خيطان' };
          }
          if (nameLower.includes('qurain')) {
            return { en: found.name, ar: 'القرين' };
          }
          if (nameLower.includes('jahra')) {
            return { en: found.name, ar: 'الجهراء' };
          }
          return { en: found.name, ar: found.name };
        }
      }
    }
  } catch (e) {
    console.error('Error looking up branch from localStorage:', e);
  }

  // 2. Direct database seeded ObjectId mapping or code mapping
  if (name === '6a3cf82764fc882a198272c5' || name.includes('ragheey') || name === '1') return { en: 'Ragheey', ar: 'الرقعي' };
  if (name === '6a3cf82764fc882a198272c6' || name.includes('mishrif') || name === '2') return { en: 'Mishrif', ar: 'مشرف' };
  if (name === '6a3cf82764fc882a198272c7' || name.includes('andalus') || name === '3') return { en: 'Andalus', ar: 'الأندلس' };
  if (name.includes('ardiya') || name === '4') return { en: 'Ardiya', ar: 'العارضية' };
  if (name.includes('khaitan') || name === '5') return { en: 'Khaitan', ar: 'خيطان' };
  if (name.includes('qurain') || name === '6') return { en: 'Qurain', ar: 'القرين' };
  if (name.includes('jahra') || name === '7') return { en: 'Jahra', ar: 'الجهراء' };
  if (name === '6a3d01028b85970b21c6dc45' || name.includes('rigai') || name === '8') return { en: 'Rigai', ar: 'الرقعي' };

  const capitalized = rawId.charAt(0).toUpperCase() + rawId.slice(1);
  return { en: capitalized, ar: capitalized };
};

const translatePaymentStatus = (status) => {
  const s = String(status || 'Pending').trim().toLowerCase();
  if (s === 'paid') return { en: 'Paid', ar: 'مدفوع' };
  if (s === 'pending') return { en: 'Pending', ar: 'معلق' };
  if (s === 'partial') return { en: 'Partial', ar: 'جزئي' };
  return { en: status, ar: status };
};

const getDeliveryTypeLabel = (order) => {
  if (order?.isHomeDelivery || String(order?.deliveryType || '').toLowerCase() === 'home delivery') {
    return { en: 'Home Delivery', ar: 'توصيل منزلي' };
  }
  const type = String(order?.deliveryType || '').toLowerCase();
  if (type === 'branch pickup' || type === 'shop pickup') {
    return { en: 'Branch Pickup', ar: 'استلام من الفرع' };
  }
  return { en: 'Branch Pickup', ar: 'استلام من الفرع' };
};

const translateDeliveryStatus = (status) => {
  const s = String(status || 'Waiting').trim().toLowerCase();
  if (s === 'waiting' || s === 'received') return { en: 'Waiting', ar: 'قيد الانتظار' };
  if (s === 'preparing in shop' || s === 'in shop' || s === 'washing') return { en: 'Preparing in shop', ar: 'قيد التحضير في المحل' };
  if (s === 'preparing in workshop' || s === 'in workshop' || s === 'drying' || s === 'ironing') return { en: 'Preparing in workshop', ar: 'قيد التحضير في الورشة' };
  if (s === 'hold' || s === 'on hold') return { en: 'Hold', ar: 'معلق' };
  if (s === 'ready') return { en: 'Ready', ar: 'جاهز' };
  if (s === 'ready for delivery' || s === 'h services') return { en: 'Ready for delivery', ar: 'جاهز للتوصيل' };
  if (s === 'ready for shop') return { en: 'Ready for shop', ar: 'جاهز للمحل' };
  if (s === 'with driver' || s === 'assigned' || s === 'out for delivery') return { en: 'With Driver', ar: 'مع السائق' };
  if (s === 'delivered') return { en: 'Delivered', ar: 'تم التسليم' };
  if (s === 'return' || s === 'cancel' || s === 'cancelled') return { en: 'Return', ar: 'مرتجع' };
  if (s === 'store' || s === 'in store') return { en: 'Store', ar: 'في المخزن' };
  if (s === 'failed') return { en: 'Failed', ar: 'فشل' };
  return { en: status, ar: status };
};

const translateGarment = (name) => {
  if (!name) return { en: 'N/A', ar: 'N/A' };
  const catalogSection = translations?.en?.counter?.makeInvoice || {};
  const keys = Object.keys(catalogSection);
  for (const key of keys) {
    const enVal = catalogSection[key];
    if (typeof enVal === 'string' && enVal.toLowerCase() === name.toLowerCase()) {
      const arVal = translations?.ar?.counter?.makeInvoice?.[key] || enVal;
      return { en: enVal, ar: arVal };
    }
  }

  // Fallback for some common names
  const lowerName = name.toLowerCase();
  if (lowerName === 'ghotraa') return { en: 'Ghotraa', ar: 'غترة' };
  if (lowerName === 'shmage') return { en: 'Shmage', ar: 'شماغ' };
  if (lowerName === 'shmage (special)') return { en: 'Shmage (Special)', ar: 'شماغ (خاص)' };
  
  return { en: name, ar: name };
};

export const getDisplayTotal = (order) =>
  order?.paymentStatus === 'Paid' ? 0 : Number(order?.totalAmount) || 0;

const normalizeReceiptId = (value) => String(value || '').trim().toUpperCase();

export const cacheReceiptSnapshot = (order) => {
  if (!order?.number) return;
  try {
    const snapshots = JSON.parse(localStorage.getItem('receipt_snapshots') || '{}');
    snapshots[order.number] = order;
    localStorage.setItem('receipt_snapshots', JSON.stringify(snapshots));
  } catch (e) {
    console.error('Failed to cache receipt snapshot', e);
  }
};

export const getReceiptUrl = (invoiceNumber, order) => {
  let base = window.location.origin;
  try {
    const stored = localStorage.getItem('spinclean-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.system?.publicReceiptUrl) {
        base = String(parsed.system.publicReceiptUrl).replace(/\/$/, '');
      }
    }
  } catch (e) {
    // use current origin
  }
  let url = `${base}/receipt/${encodeURIComponent(invoiceNumber)}`;
  // Embed order data in query string so any device scanning the QR sees real data
  if (order) {
    try {
      const slim = {
        number: order.number,
        date: order.date,
        customerName: order.customerName,
        staffName: order.staffName || order.createdBy,
        serviceType: order.serviceType,
        paymentStatus: order.paymentStatus,
        branchId: order.branchId || order.branch,
        amount: order.amount,
        discount: order.discount,
        tax: order.tax,
        taxRate: order.taxRate,
        totalAmount: order.totalAmount,
        deliveryType: order.deliveryType,
        deliveryStatus: order.deliveryStatus || order.status,
        itemDetails: (order.itemDetails || []).map(it => ({
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          notes: it.notes,
        })),
      };
      const json = JSON.stringify(slim);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      url += `?d=${encodeURIComponent(encoded)}`;
    } catch (e) {
      console.error('Failed to embed order data in receipt URL', e);
    }
  }
  return url;
};

export const decodeReceiptData = (search, hash) => {
  try {
    let encoded = null;
    if (search) {
      const params = new URLSearchParams(search);
      encoded = params.get('d');
    }
    if (!encoded && hash) {
      const match = hash.match(/d=(.+)/);
      if (match) {
        encoded = match[1];
      }
    }
    if (!encoded) return null;
    const decodedB64 = decodeURIComponent(encoded);
    const json = decodeURIComponent(escape(atob(decodedB64)));
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode receipt data from URL', e);
    return null;
  }
};

export const findReceiptOrder = (id, mockOrders = []) => {
  if (!id) return null;
  const target = normalizeReceiptId(id);

  try {
    const snapshots = JSON.parse(localStorage.getItem('receipt_snapshots') || '{}');
    if (snapshots[id]) return snapshots[id];
    const snapshotMatch = Object.values(snapshots).find(
      (o) => normalizeReceiptId(o.number) === target
    );
    if (snapshotMatch) return snapshotMatch;
  } catch (e) {
    console.error(e);
  }

  try {
    const saved = localStorage.getItem('orders_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      const direct = parsed.find(
        (o) => normalizeReceiptId(o.number) === target || String(o.id) === String(id)
      );
      if (direct) return direct;
    }
  } catch (e) {
    console.error(e);
  }

  let found = mockOrders.find(
    (o) => normalizeReceiptId(o.number) === target || String(o.id) === String(id)
  );
  if (!found && id.includes('-')) {
    const numPart = id.split('-').pop();
    found = mockOrders.find((o) => o.number?.endsWith(numPart));
  }
  return found || null;
};

export const generateInvoicePDF = (order, { showPaidTotal = false } = {}) => {
  cacheReceiptSnapshot(order);

  const translatedPayment = translatePaymentStatus(order?.paymentStatus);
  const translatedDelivery = translateDeliveryStatus(order?.deliveryStatus || order?.status);
  const translatedDeliveryType = getDeliveryTypeLabel(order);
  const translatedBranch = translateBranch(order?.branchId || order?.branch);
  const translatedService = translateService(order?.serviceType);
  const displayTotal = showPaidTotal
    ? Number(order?.totalAmount) || 0
    : getDisplayTotal(order);
  const receiptUrl = getReceiptUrl(order?.number || '', order);

  // Parse items
  const itemsHtml = (order?.itemDetails || []).map((it) => {
    const translatedItem = translateGarment(it.name);
    const noteHtml = it.notes ? `<div class="item-notes">Note: ${it.notes}</div>` : '';
    
    return `
      <tr>
        <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: left;">
          <div style="font-weight: bold; font-size: 11px;">${translatedItem.en}</div>
          <div style="font-size: 11px; color: #222; direction: rtl; text-align: right; font-weight: 700;">${translatedItem.ar}</div>
          ${noteHtml}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: center; font-size: 11px; font-weight: bold;">
          ${it.quantity}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: right; font-family: monospace; font-size: 10px;">
          ${formatCurrency(it.unitPrice)}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: right; font-family: monospace; font-size: 11px; font-weight: bold;">
          ${formatCurrency(it.quantity * it.unitPrice)}
        </td>
      </tr>
    `;
  }).join('');

  // Discount lines
  let discountLine = '';
  if (order?.discount > 0) {
    discountLine = `
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #e11d48; font-weight: bold; margin-bottom: 3px;">
        <span style="font-size: 12px; font-weight: 800;">Discount / الخصم:</span>
        <span style="font-family: monospace;">-${formatCurrency(order.discount)}</span>
      </div>
    `;
  }

  // Tax lines
  let taxLine = '';
  if (order?.tax > 0) {
    taxLine = `
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; color: #555;">
        <span>Tax (${order.taxRate || 0}%) / الضريبة (${order.taxRate || 0}%):</span>
        <span style="font-family: monospace;">${formatCurrency(order.tax)}</span>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="ltr">
      <head>
        <meta charset="utf-8">
        <title>Invoice ${order?.number || 'N/A'}</title>
        <style>
          @media print {
            @page {
              margin: 4mm 4mm 4mm 4mm;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #111;
            margin: 0;
            padding: 5px;
            font-size: 11px;
            line-height: 1.3;
            background-color: #fff;
          }
          .receipt-container {
            max-width: 100mm;
            margin: 0 auto;
            box-sizing: border-box;
            border: 2px solid #000;
            padding: 8px;
          }
          .brand-header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 6px;
          }
          .brand-name {
            font-size: 18px;
            font-weight: 800;
            color: #2563eb;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .brand-name-ar {
            font-size: 18px;
            font-weight: 900;
            color: #2563eb;
            margin: 2px 0 0 0;
          }
          .receipt-title {
            font-size: 13px;
            color: #000;
            margin: 4px 0 0 0;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .info-section {
            border-bottom: 1px dashed #bbb;
            padding-bottom: 5px;
            margin-bottom: 8px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 11px;
          }
          .info-label {
            color: #111;
            font-weight: 800;
            font-size: 11px;
          }
          .info-value {
            font-weight: 800;
            text-align: right;
            font-size: 11px;
          }
          .table-header th {
            border-bottom: 1px solid #111;
            font-size: 9px;
            font-weight: 900;
            padding: 4px 2px;
            text-transform: uppercase;
            color: #000;
          }
          .item-notes {
            font-size: 8px;
            color: #666;
            font-style: italic;
            margin-top: 1px;
          }
          .summary-section {
            border-top: 1px dashed #bbb;
            padding-top: 5px;
            margin-top: 6px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 900;
            border-top: 2px solid #111;
            padding-top: 6px;
            margin-top: 6px;
          }
          .footer-section {
            text-align: center;
            font-size: 10px;
            color: #444;
            margin-top: 15px;
            border-top: 1px dashed #bbb;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="brand-header" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 8px;">
            <!-- Top row: English left | Logo center | Arabic right -->
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;">
              <div style="text-align: left; flex: 1;">
                <div style="font-size: 10px; font-weight: 800; color: #1a1a1a; line-height: 1.3;">Tuhama Laundry Co.</div>
                <div style="font-size: 8px; color: #555; line-height: 1.2;">Cleaning, Ironing &amp; Wash in K.</div>
              </div>
              <div style="flex: 0 0 auto; margin: 0 8px;">
                <img src="${window.location.origin}/logo.png" alt="Tuhama Logo" style="width: 50px; height: 50px; object-fit: contain; border-radius: 10px; display: block;" />
              </div>
              <div style="text-align: right; flex: 1; direction: rtl;">
                <div style="font-size: 11px; font-weight: 800; color: #1a1a1a; line-height: 1.3;">شركة مصابغ تهامة</div>
                <div style="font-size: 8px; color: #555; line-height: 1.2;">تنظيف وكي وغسيل</div>
              </div>
            </div>
            <!-- Phone numbers row -->
            <div style="display: flex; justify-content: center; gap: 16px; margin-top: 2px; margin-bottom: 4px;">
              <span style="font-size: 9px; font-weight: bold; color: #333;">Tel: 222 03 222</span>
              <span style="font-size: 9px; font-weight: bold; color: #333;">222 03 222</span>
            </div>
            <div class="receipt-title">Receipt / Invoice - إيصال / فاتورة</div>
          </div>
          
          <div class="info-section">
            <div class="info-row" style="background: #f0f4ff; border: 1.5px solid #2563eb; border-radius: 4px; padding: 6px 8px; margin-bottom: 8px;">
              <span class="info-label" style="font-size: 13px; color: #2563eb;">Invoice / رقم الفاتورة:</span>
              <span class="info-value" style="font-size: 14px; color: #2563eb; font-weight: 900;">${order?.number || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date / التاريخ:</span>
              <span class="info-value">${order?.date || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Branch / الفرع:</span>
              <span class="info-value">${translatedBranch.en} / <span style="direction: rtl;">${translatedBranch.ar}</span></span>
            </div>
            <div class="info-row">
              <span class="info-label">Customer / العميل:</span>
              <span class="info-value">${order?.customerName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Staff / الموظف:</span>
              <span class="info-value">${order?.staffName || order?.createdBy || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Service Type / نوع الخدمة:</span>
              <span class="info-value">${translatedService.en === translatedService.ar ? translatedService.en : `${translatedService.en} / <span style="direction: rtl;">${translatedService.ar}</span>`}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Status / الدفع:</span>
              <span class="info-value">${translatedPayment.en} / <span style="direction: rtl;">${translatedPayment.ar}</span></span>
            </div>
            <div class="info-row">
              <span class="info-label">Delivery Type / نوع التوصيل:</span>
              <span class="info-value">${translatedDeliveryType.en} / <span style="direction: rtl;">${translatedDeliveryType.ar}</span></span>
            </div>
            <div class="info-row">
              <span class="info-label">Delivery Status / Delivery:</span>
              <span class="info-value">${translatedDelivery.en} / <span style="direction: rtl;">${translatedDelivery.ar}</span></span>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
            <thead>
              <tr class="table-header">
                <th style="width: 50%; text-align: left; padding: 4px 2px;">Item<br><span style="font-size: 10px; font-weight: 900;">الصنف</span></th>
                <th style="width: 12%; text-align: center; padding: 4px 2px;">Qty<br><span style="font-size: 10px; font-weight: 900;">الكمية</span></th>
                <th style="width: 18%; text-align: right; padding: 4px 2px;">Price<br><span style="font-size: 10px; font-weight: 900;">السعر</span></th>
                <th style="width: 20%; text-align: right; padding: 4px 2px;">Total<br><span style="font-size: 10px; font-weight: 900;">الإجمالي</span></th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="summary-section">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; color: #555;">
              <span style="font-size: 12px; font-weight: 800;">Subtotal / المجموع الفرعي:</span>
              <span style="font-family: monospace;">${formatCurrency(order?.amount || 0)}</span>
            </div>
            ${discountLine}
            ${taxLine}
            <div class="total-row">
              <span style="font-size: 14px; font-weight: 900;">Total Amount / إجمالي السعر:</span>
              <span style="font-family: monospace; font-size: 15px; font-weight: 900;">${formatCurrency(displayTotal)}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 15px; margin-bottom: 10px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(receiptUrl)}" alt="Invoice QR" style="width: 70px; height: 70px;" />
            <div style="font-size: 10px; color: #444; margin-top: 4px; font-weight: 800;">Scan to View Invoice</div>
            <div style="font-size: 10px; color: #444; direction: rtl; font-weight: 700;">امسح لفتح الفاتورة</div>
          </div>
          
          <div class="footer-section">
            <div style="font-weight: 800; margin-bottom: 2px; font-size: 10px;">Thank you for choosing Tuhama PRO!</div>
            <div style="direction: rtl; font-weight: 900; font-size: 10px;">شكراً لاختياركم تهامة برو!</div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Hidden iframe logic
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  iframe.onload = () => {
    const triggerPrint = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
    const qrImg = iframe.contentWindow.document.querySelector('img[alt="Invoice QR"]');
    if (qrImg && !qrImg.complete) {
      qrImg.onload = () => setTimeout(triggerPrint, 150);
      qrImg.onerror = () => setTimeout(triggerPrint, 150);
    } else {
      setTimeout(triggerPrint, 250);
    }
  };

  // Clean up
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 10000);
};

// ——— Payment report ———

export const PAYMENT_EXPORT_COLUMNS = [
  { key: 'id', label: 'Payment ID', format: (v) => `PAY-${String(v).padStart(4, '0')}` },
  { key: 'orderNumber', label: 'Order #' },
  { key: 'customer', label: 'Customer' },
  { key: 'amount', label: 'Amount', format: (v) => formatCurrency(v) },
  { key: 'method', label: 'Method' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date', format: (v) => formatDate(v) },
];

export const exportPaymentsCSV = (payments, filename = 'payments-report') =>
  exportToCSV(payments, filename, PAYMENT_EXPORT_COLUMNS);

export const exportPaymentsPDF = (payments, summary, filename = 'payments-report') =>
  exportToPDF({
    title: 'Tuhama — Payments Report',
    subtitle: 'Financial transaction summary',
    columns: PAYMENT_EXPORT_COLUMNS,
    data: payments,
    filename,
    summaryLines: summary,
  });

// ——— Staff report ———

export const STAFF_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'username', label: 'Username', format: (v) => (v ? `@${v}` : '') },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'joiningDate', label: 'Joining Date', format: (v) => formatDate(v) },
];

export const exportStaffCSV = (staff, filename = 'staff-directory') =>
  exportToCSV(staff, filename, STAFF_EXPORT_COLUMNS);

export const exportStaffPDF = (staff, summary, filename = 'staff-directory') =>
  exportToPDF({
    title: 'Tuhama — Staff Directory',
    subtitle: 'Employee listing and roles',
    columns: STAFF_EXPORT_COLUMNS,
    data: staff,
    filename,
    summaryLines: summary,
  });

const DEFAULT_BRANCHES = [
  { id: 1, name: 'Ragheey' },
  { id: 2, name: 'Mishrif' },
  { id: 3, name: 'Andalus' },
  { id: 4, name: 'Ardiya' },
  { id: 5, name: 'Khaitan' },
  { id: 6, name: 'Qurain' },
  { id: 7, name: 'Jahra' },
  { id: 8, name: 'Rigai' },
];

const getBranchDirectory = () => {
  try {
    const saved = localStorage.getItem('branches_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_BRANCHES;
};

export const resolveBranchName = (branchIdOrName) => {
  if (branchIdOrName == null || branchIdOrName === '' || branchIdOrName === 'null' || branchIdOrName === 'undefined') return '';
  const raw = String(branchIdOrName).trim();
  if (raw === 'null' || raw === 'undefined') return '';
  const branches = getBranchDirectory();

  const byId = branches.find((b) => String(b.id || b._id || '') === raw);
  if (byId?.name) return byId.name;

  const lower = raw.toLowerCase();
  const byName = branches.find(
    (b) =>
      b.name?.toLowerCase() === lower ||
      lower.includes(b.name?.toLowerCase()) ||
      b.name?.toLowerCase().includes(lower)
  );
  if (byName?.name) return byName.name;

  if (!/^\d+$/.test(raw)) return raw;
  return '';
};

export const getBranchPrefix3 = (branchIdOrName) => {
  const name = resolveBranchName(branchIdOrName);
  if (!name) return 'SYS';
  const letters = name.replace(/[^a-zA-Z]/g, '');
  if (!letters) return 'SYS';
  return letters.slice(0, 3).toUpperCase();
};

export const getBranchCode = (branchIdOrName) => {
  if (!branchIdOrName || branchIdOrName === 'null' || branchIdOrName === 'undefined') return 'SYS';
  const name = String(branchIdOrName).toLowerCase();
  if (name === 'null' || name === 'undefined') return 'SYS';
  if (name.includes('ragheey') || name === '1') return 'RG';
  if (name.includes('mishrif') || name === '2') return 'MS';
  if (name.includes('andalus') || name === '3') return 'AD';
  if (name.includes('ardiya') || name === '4') return 'AR';
  if (name.includes('khaitan') || name === '5') return 'KH';
  if (name.includes('qurain') || name === '6') return 'QU';
  if (name.includes('jahra') || name === '7') return 'JH';
  if (name.includes('rigai') || name === '8') return 'RI';
  return 'SYS';
};

const sameBranch = (a, b, prefix) => {
  if (prefix === 'INV') {
    return getBranchPrefix3(a) === getBranchPrefix3(b);
  }
  return getBranchCode(a) === getBranchCode(b);
};

export const getNextBranchOrderNo = (orders, branchId, prefix = 'ORD') => {
  const branchKey = branchId;
  const branchOrders = orders.filter((o) =>
    sameBranch(o.branchId || o.branch, branchKey, prefix)
  );

  let maxSeq = prefix === 'INV' ? 0 : 100;
  branchOrders.forEach((o) => {
    const match = o.number?.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const seq = prefix === 'INV' ? String(nextSeq).padStart(3, '0') : String(nextSeq).padStart(5, '0');

  if (prefix === 'INV') {
    return `${getBranchPrefix3(branchId)}-${seq}`;
  }

  const code = getBranchCode(branchId);
  return `${code}-${prefix}-${seq}`;
};
