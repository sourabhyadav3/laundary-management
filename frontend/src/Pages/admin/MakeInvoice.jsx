import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AdminStateContext, GARMENT_CATALOG } from '../../context/AdminStateContext';
import { FiTrash2, FiSearch, FiCheck, FiX } from 'react-icons/fi';
import { formatCurrency, generateInvoicePDF, getNextBranchOrderNo } from '../../utils/exportUtils';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { translateGarmentName } from '../../utils/garmentTranslations';
import {
    EMPTY_CATALOG_PRICES,
    SERVICE_PRICE_FIELDS,
    getGarmentPriceForService,
    getPrimaryCatalogPrice,
    hasAnyCatalogPrice,
    parseCatalogPrices,
} from '../../utils/garmentPricing';

const EMPTY_CATALOG_FORM = {
    name: '',
    icon: '👕',
    price: '',
    prices: { ...EMPTY_CATALOG_PRICES },
    color: '#3b82f6',
    image: null,
    hasSizes: false,
    sizes: [],
};

const SERVICE_MODES = [
    { id: 'Normal', label: 'Normal / Wash & Iron', key: 'normalService', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { id: 'Iron Only', label: 'Iron Only', key: 'ironOnlyService', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { id: 'Dry Cleaning', label: 'Dry Cleaning Only', key: 'dryCleanService', color: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { id: 'Urgent', label: 'Express', key: 'urgentService', color: 'bg-rose-600 hover:bg-rose-700 text-white' },
];

// Light mode: vibrant fills that pop on the sky-blue background
const CARD_COLORS_LIGHT = [
    'bg-blue-200 border-blue-400 text-blue-900 shadow-blue-100',
    'bg-emerald-200 border-emerald-400 text-emerald-900 shadow-emerald-100',
    'bg-amber-200 border-amber-400 text-amber-900 shadow-amber-100',
    'bg-violet-200 border-violet-400 text-violet-900 shadow-violet-100',
    'bg-rose-200 border-rose-400 text-rose-900 shadow-rose-100',
    'bg-teal-200 border-teal-400 text-teal-900 shadow-teal-100',
];

// Dark mode: deep translucent fills — unchanged from before
const CARD_COLORS_DARK = [
    'bg-blue-950/40 border-blue-900/40 text-blue-200',
    'bg-emerald-950/40 border-emerald-900/40 text-emerald-200',
    'bg-amber-950/40 border-amber-900/40 text-amber-200',
    'bg-purple-950/40 border-purple-900/40 text-purple-200',
    'bg-rose-950/40 border-rose-900/40 text-rose-200',
    'bg-cyan-950/40 border-cyan-900/40 text-cyan-200',
];

const MakeInvoice = () => {
    const { customers, orders, addOrder, setCustomers, catalog, setCatalog, selectedBranch, payments, setPayments, services, addCatalogItem, updateCatalogItem, deleteCatalogItem } = useContext(AdminStateContext);
    const navigate = useNavigate();
    const { language, t, tr } = useLanguage();
    const { theme } = useTheme();

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = storedUser?.role || 'Admin';
    const assignedBranch = storedUser?.assignedBranch || '';

    // Pick card color set based on active theme
    const CARD_COLORS = theme === 'light' ? CARD_COLORS_LIGHT : CARD_COLORS_DARK;

    const getGarmentDisplayName = (catalogItemOrName) => {
        const name = typeof catalogItemOrName === 'string' ? catalogItemOrName : catalogItemOrName?.name;
        const catalogItem = typeof catalogItemOrName === 'string'
            ? catalog.find((g) => g.name === catalogItemOrName)
            : catalogItemOrName;

        if (language === 'ar') {
            if (catalogItem?.nameAr) return catalogItem.nameAr;
            if (catalogItem && catalogItem.category !== 'custom' && !catalogItem.isNameEdited && catalogItem.key) {
                return t(`counter.makeInvoice.${catalogItem.key}`) || name;
            }
            return translateGarmentName(name) || name;
        }
        return name;
    };

    const getTranslatedItemName = (name) => getGarmentDisplayName(name);

    const getTranslatedServiceMode = (mode) => {
        if (language !== 'ar') return mode;
        if (mode === 'Express Iron & Wash') return 'غسيل وكوي مستعجل';
        if (mode === 'Iron & Wash') return 'غسيل وكوي عادي';
        if (mode === 'Express Iron') return 'كوي مستعجل';
        if (mode === 'Iron Only') return 'كوي عادي';
        if (mode === 'Dry Cleaning') return t('counter.makeInvoice.dryCleanService');
        const foundMode = SERVICE_MODES.find((m) => m.id === mode);
        if (foundMode) {
            return t(`counter.makeInvoice.${foundMode.key}`) || mode;
        }
        return tr(mode) || mode;
    };

    // Basic Page State
    const [form, setForm] = useState(() => {
        const saved = localStorage.getItem('admin_draft_invoice_form');
        const defaults = {
            customerId: '',
            phoneSearch: '',
            expectedDeliveryDate: '',
            notes: '',
            paperInvNo: '',
            discountChecked: false,
            discountPercent: 0,
            discountValue: 0,
            deliveryMode: 'branch',
        };
        if (!saved) return defaults;
        const parsed = JSON.parse(saved);
        return {
            ...defaults,
            ...parsed,
            deliveryMode: parsed.deliveryMode || (parsed.isHomeDelivery ? 'home' : 'branch'),
        };
    });

    const [activeGarmentIdx, setActiveGarmentIdx] = useState(null);
    const [quickServiceMode, setQuickServiceMode] = useState('Iron & Wash'); // Default service mode

    // Add Catalog Modal State
    const [showAddCatalogModal, setShowAddCatalogModal] = useState(false);
    const [newCatalogForm, setNewCatalogForm] = useState({ ...EMPTY_CATALOG_FORM });

    // Remove / Edit Modes
    const [removeCatalogMode, setRemoveCatalogMode] = useState(false);
    const [editCatalogMode, setEditCatalogMode] = useState(false);
    const [isCatalogMenuOpen, setIsCatalogMenuOpen] = useState(false);
    const catalogMenuRef = useRef(null);
    const [mismatchError, setMismatchError] = useState(null);
    const [editingLineTotalIdx, setEditingLineTotalIdx] = useState(null);
    const [editingLineTotalValue, setEditingLineTotalValue] = useState('');

    // Size Selection Modal
    const [selectedGarmentForSize, setSelectedGarmentForSize] = useState(null);
    // Carpet Size Modal
    const [selectedGarmentForCarpet, setSelectedGarmentForCarpet] = useState(null);
    const [carpetHeightM, setCarpetHeightM] = useState('');
    const [carpetWidthM, setCarpetWidthM] = useState('');

    // Edit Catalog Modal State
    const [showEditCatalogModal, setShowEditCatalogModal] = useState(false);
    const [editCatalogForm, setEditCatalogForm] = useState({ idx: null, ...EMPTY_CATALOG_FORM });

    const removeCatalogItem = async (idx) => {
        const item = catalog[idx];
        if (deleteCatalogItem) {
            await deleteCatalogItem(item.key);
        } else {
            setCatalog(prev => prev.filter((_, i) => i !== idx));
        }
        if (catalog.length <= 1) {
            setRemoveCatalogMode(false);
        }
        toast.success(`"${item.name}" removed from catalog`);
    };

    // Auto icon matcher based on garment name keywords
    const getAutoIcon = (name) => {
        const n = name.toLowerCase();
        if (/shirt|shirt/.test(n)) return '👔';
        if (/t-shirt|tshirt|tee/.test(n)) return '👕';
        if (/kurta|kurti/.test(n)) return '👘';
        if (/sherwani/.test(n)) return '🤵';
        if (/abaya|burqa|niqab/.test(n)) return '🧕';
        if (/saree|sari/.test(n)) return '🦸';
        if (/dupatta|scarf|stole/.test(n)) return '🧣';
        if (/pant|trouser|jean|jeans/.test(n)) return '👖';
        if (/shorts/.test(n)) return '🩳';
        if (/suit|blazer/.test(n)) return '🤵';
        if (/coat|jacket|hoodie/.test(n)) return '🧥';
        if (/dress|frock|gown|lehenga/.test(n)) return '👗';
        if (/skirt/.test(n)) return '👗';
        if (/blouse|top/.test(n)) return '👚';
        if (/sweater|pullover|knitwear/.test(n)) return '🧦';
        if (/underwear|innerwear|bra/.test(n)) return '🩲';
        if (/swimsuit|bikini/.test(n)) return '🩱';
        if (/socks|sock/.test(n)) return '🧦';
        if (/gloves|glove/.test(n)) return '🧤';
        if (/cap|hat|topi/.test(n)) return '🧢';
        if (/shoes|shoe|boots|sandal|chappal/.test(n)) return '👟';
        if (/bag|purse/.test(n)) return '👜';
        if (/towel/.test(n)) return '🧸';
        if (/bedsheet|sheet|chadar|blanket/.test(n)) return '🛏️';
        if (/curtain|parda/.test(n)) return '🪟';
        if (/tie|necktie/.test(n)) return '👔';
        if (/vest|waistcoat/.test(n)) return '🦸';
        return '👕'; // default
    };

    const handleAddCatalogSubmit = async () => {
        if (!newCatalogForm.name.trim()) {
            toast.error(t('counter.makeInvoice.garmentNameRequired') || 'Garment name is required');
            return;
        }
        const rawName = newCatalogForm.name.trim();
        const dictAr = translateGarmentName(rawName);
        const nameAr = dictAr || (language === 'ar' ? rawName : dictAr || '');
        const prices = parseCatalogPrices(newCatalogForm.prices);

        if (!hasAnyCatalogPrice(newCatalogForm.prices)) {
            toast.error(t('counter.makeInvoice.atLeastOnePriceRequired'));
            return;
        }

        const primaryPrice = getPrimaryCatalogPrice(newCatalogForm.prices);
        const newItem = {
            name: rawName,
            nameAr: nameAr || dictAr || rawName,
            key: `custom_${Date.now()}`,
            price: primaryPrice,
            prices,
            icon: newCatalogForm.icon || '👕',
            category: 'custom',
            color: newCatalogForm.color || '#3b82f6',
            image: newCatalogForm.image || null,
            hasSizes: newCatalogForm.hasSizes,
            sizes: newCatalogForm.hasSizes ? newCatalogForm.sizes : []
        };
        if (addCatalogItem) {
            await addCatalogItem(newItem);
        } else {
            setCatalog(prev => [...prev, newItem]);
        }
        setNewCatalogForm({ ...EMPTY_CATALOG_FORM });
        setShowAddCatalogModal(false);
        toast.success(language === 'ar' ? `تمت إضافة "${getGarmentDisplayName(newItem)}" إلى الكتالوج` : `"${rawName}" added to catalog`);
    };

    const handleEditCatalogSubmit = async () => {
        if (!editCatalogForm.name.trim()) {
            toast.error(t('counter.makeInvoice.garmentNameRequired') || 'Garment name is required');
            return;
        }
        const rawName = editCatalogForm.name.trim();
        const dictAr = translateGarmentName(rawName);
        const prices = parseCatalogPrices(editCatalogForm.prices);

        if (!editCatalogForm.hasSizes && !hasAnyCatalogPrice(editCatalogForm.prices)) {
            toast.error(t('counter.makeInvoice.atLeastOnePriceRequired'));
            return;
        }

        const originalItem = catalog[editCatalogForm.idx];
        const defaultItem = GARMENT_CATALOG.find(d => d.key === originalItem.key);
        const isNameEdited = defaultItem ? (rawName !== defaultItem.name) : true;
        const nameAr = dictAr || (language === 'ar' ? rawName : originalItem.nameAr || dictAr || '');
        const primaryPrice = editCatalogForm.hasSizes
            ? Number(editCatalogForm.price) || Number(originalItem.price) || 0
            : getPrimaryCatalogPrice(editCatalogForm.prices);

        const updatedItem = {
            ...originalItem,
            name: rawName,
            nameAr: nameAr || dictAr || rawName,
            icon: editCatalogForm.icon,
            price: primaryPrice,
            prices: editCatalogForm.hasSizes ? originalItem.prices : prices,
            isNameEdited: isNameEdited,
            color: editCatalogForm.color || '#3b82f6',
            image: editCatalogForm.image || null,
            hasSizes: editCatalogForm.hasSizes,
            sizes: editCatalogForm.hasSizes ? editCatalogForm.sizes : []
        };

        if (updateCatalogItem) {
            await updateCatalogItem(originalItem.key, updatedItem);
        } else {
            setCatalog(prev => prev.map(c => c.key === originalItem.key ? updatedItem : c));
        }
        toast.success(language === 'ar' ? 'تم التحديث بنجاح' : `"${rawName}" updated successfully`);
        setShowEditCatalogModal(false);
    };

    const [orderItems, setOrderItems] = useState(() => {
        const saved = localStorage.getItem('admin_draft_invoice_items');
        return saved ? JSON.parse(saved) : [];
    });
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const customerDropdownRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('admin_draft_invoice_form', JSON.stringify(form));
    }, [form]);

    useEffect(() => {
        localStorage.setItem('admin_draft_invoice_items', JSON.stringify(orderItems));
    }, [orderItems]);

    const clearDraftInvoice = () => {
        localStorage.removeItem('admin_draft_invoice_form');
        localStorage.removeItem('admin_draft_invoice_items');
    };

    useEffect(() => {
        const handleCatalogMenuOutsideClick = (event) => {
            if (catalogMenuRef.current && !catalogMenuRef.current.contains(event.target)) {
                setIsCatalogMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleCatalogMenuOutsideClick);
        return () => document.removeEventListener('mousedown', handleCatalogMenuOutsideClick);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Current Date/Time for display
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Lock parent scroll on desktop only for this POS page
    useEffect(() => {
        const adminContent = document.querySelector('.admin-content');
        const isDesktop = window.innerWidth >= 1024;
        if (adminContent && isDesktop) {
            adminContent.style.overflow = 'hidden';
        }
        return () => {
            if (adminContent) {
                adminContent.style.overflow = '';
            }
        };
    }, []);

    // Set default delivery date to 3 days from now if not already set
    useEffect(() => {
        if (!form.expectedDeliveryDate) {
            const date = new Date();
            date.setDate(date.getDate() + 3);
            const dateString = date.toISOString().split('T')[0];
            setForm((prev) => ({ ...prev, expectedDeliveryDate: dateString }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filtered Customers based on Query
    const filteredCustomersList = useMemo(() => {
        if (!customerSearchQuery) return customers;
        return customers.filter(
            (c) =>
                c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                c.phone.includes(customerSearchQuery)
        );
    }, [customers, customerSearchQuery]);

    // Selected Customer Details
    const selectedCustomerObj = useMemo(() => {
        return customers.find((c) => String(c.id) === String(form.customerId)) || null;
    }, [customers, form.customerId]);

    const getCustomerDisplayName = (customer) => {
        if (!customer) return '';
        if (language === 'ar' && customer.arabicName?.trim()) return customer.arabicName.trim();
        return customer.name;
    };

    const customerInputDisplay =
        customerSearchQuery !== '' || showSearchResults
            ? customerSearchQuery
            : selectedCustomerObj
                ? `${getCustomerDisplayName(selectedCustomerObj)} (${selectedCustomerObj.phone})`
                : '';

    // Billing Calculations
    const subtotal = useMemo(() => {
        return orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    }, [orderItems]);

    const discountAmount = useMemo(() => {
        if (!form.discountChecked) return 0;
        let amt = 0;
        if (form.discountPercent > 0) {
            amt += subtotal * (form.discountPercent / 100);
        }
        if (form.discountValue > 0) {
            amt += Number(form.discountValue);
        }
        return Math.min(amt, subtotal);
    }, [subtotal, form.discountChecked, form.discountPercent, form.discountValue]);

    const tax = 0; // Tax removed
    const taxRate = 0;

    const totalAmount = useMemo(() => {
        return Math.round((subtotal - discountAmount) * 1000) / 1000;
    }, [subtotal, discountAmount]);

    // Handlers
    const handlePhoneSearch = () => {
        if (!form.phoneSearch) {
            toast.info('Please enter a phone number to search');
            return;
        }
        const match = customers.find((c) => c.phone.includes(form.phoneSearch) || (c.phones && c.phones.some(p => p.includes(form.phoneSearch))));
        if (match) {
            const isCustomDiscount = match.customerLevel === 'Custom Discount';
            const discountVal = isCustomDiscount ? Number(match.customDiscountRate || 0) : Number(match.customerLevel || 0);
            const hasDiscount = discountVal > 0;
            setForm((prev) => ({
                ...prev,
                customerId: match.id,
                phoneSearch: match.phone,
                discountChecked: hasDiscount ? true : false,
                discountPercent: hasDiscount ? discountVal : 0,
                discountValue: 0
            }));
            setCustomerSearchQuery('');
            toast.success(`Selected customer: ${match.name}`);
        } else {
            toast.error('Customer not found with that phone number');
        }
    };

    const handleSelectCustomer = (cust) => {
        const isCustomDiscount = cust.customerLevel === 'Custom Discount';
        const discountVal = isCustomDiscount ? Number(cust.customDiscountRate || 0) : Number(cust.customerLevel || 0);
        const hasDiscount = discountVal > 0;
        setForm((prev) => ({
            ...prev,
            customerId: cust.id,
            phoneSearch: cust.phone,
            discountChecked: hasDiscount ? true : false,
            discountPercent: hasDiscount ? discountVal : 0,
            discountValue: 0
        }));
        setCustomerSearchQuery('');
        setShowSearchResults(false);
    };

    const addGarment = (g, service, modifierNotes = '') => {
        if (orderItems.length > 0) {
            const hasExpress = orderItems.some(item => item.service.toLowerCase().includes('express'));
            const isNewItemExpress = service.toLowerCase().includes('express');
            
            if (hasExpress && !isNewItemExpress) {
                setMismatchError(language === 'ar' ? 'لا يمكنك إضافة خدمة عادية مع خدمة مستعجلة في نفس الفاتورة. يرجى إنشاء فاتورة منفصلة.' : 'You cannot add a normal item when there are express items. Please create a separate invoice.');
                return;
            }
            if (!hasExpress && isNewItemExpress) {
                setMismatchError(language === 'ar' ? 'لا يمكنك إضافة خدمة مستعجلة مع خدمة عادية في نفس الفاتورة. يرجى إنشاء فاتورة منفصلة.' : 'You cannot add an express item when there are normal items. Please create a separate invoice.');
                return;
            }
        }

        setOrderItems((prev) => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                name: g.name,
                service: service,
                quantity: 1,
                unitPrice: getGarmentPriceForService(g, service),
                notes: modifierNotes,
            },
        ]);
    };

    const updateQuantity = (idx, amount) => {
        setOrderItems((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], quantity: Math.max(1, copy[idx].quantity + amount) };
            return copy;
        });
    };

    const updateItemNotes = (idx, val) => {
        setOrderItems((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], notes: val };
            return copy;
        });
    };

    const startEditLineTotal = (idx) => {
        const item = orderItems[idx];
        if (!item) return;
        const currentTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        setEditingLineTotalIdx(idx);
        setEditingLineTotalValue(String(currentTotal.toFixed(3)));
    };

    const saveEditedLineTotal = (idx) => {
        const parsedTotal = Number(editingLineTotalValue);
        if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
            toast.error(language === 'ar' ? 'يرجى إدخال قيمة صحيحة' : 'Please enter a valid total');
            return;
        }

        setOrderItems((prev) => {
            const copy = [...prev];
            const item = copy[idx];
            if (!item) return prev;
            const qty = Number(item.quantity) || 1;
            const unitPrice = Math.round((parsedTotal / qty) * 1000) / 1000;
            copy[idx] = { ...item, unitPrice };
            return copy;
        });

        setEditingLineTotalIdx(null);
        setEditingLineTotalValue('');
    };

    const removeItem = (idx) => {
        setOrderItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleReset = () => {
        setForm({
            customerId: '',
            phoneSearch: '',
            expectedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            notes: '',
            paperInvNo: '',
            discountChecked: false,
            discountPercent: 0,
            discountValue: 0,
            deliveryMode: 'branch',
        });
        setOrderItems([]);
        setCustomerSearchQuery('');
        setActiveGarmentIdx(null);
        clearDraftInvoice();
        toast.info('Invoice template reset');
    };

    // ── Settle & Pay ────────────────────────────────────────────────
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [paymentStep, setPaymentStep] = useState('select'); // 'select' | 'card' | 'link' | 'wamt'
    const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvv: '' });
    const [linkForm, setLinkForm] = useState({ email: '' });
    const [wamtForm, setWamtForm] = useState({ mobile: '' });

    // Modifiers State
    const [selectedGarmentForModifier, setSelectedGarmentForModifier] = useState(null);
    const [modifierForm, setModifierForm] = useState({
        neel: false,
        colorChoice: '',
        fold: 'Normal',
        starch: 'Without',
    });

    const validateInvoice = () => {
        if (!form.customerId) { toast.error('Please select a customer'); return false; }
        if (orderItems.length === 0) { toast.error('Add at least one garment'); return false; }
        return true;
    };

    const handleSettleAndPay = (method) => {
        const customerObj = customers.find((c) => String(c.id) === String(form.customerId));
        const orderId = Date.now();
        const branchId = (userRole === 'Admin' || userRole === 'Super Admin') ? (selectedBranch !== 'All' ? selectedBranch : null) : assignedBranch;
        const orderNo = getNextBranchOrderNo(orders, branchId, 'INV');

        const newOrder = {
            id: orderId,
            number: orderNo,
            customerId: customerObj.id,
            customerName: customerObj.name,
            serviceType: quickServiceMode,
            status: 'Waiting',
            deliveryStatus: 'Waiting',
            isHomeDelivery: form.deliveryMode === 'home',
            deliveryType: form.deliveryMode === 'home' ? 'Home Delivery' : 'Branch Pickup',
            paymentStatus: 'Paid',
            paymentMethod: method,
            amount: subtotal,
            tax,
            taxRate,
            discount: discountAmount,
            totalAmount,
            date: new Date().toISOString().split('T')[0],
            pickupDate: new Date().toISOString().split('T')[0],
            deliveryDate: form.expectedDeliveryDate,
            paperInvoiceNo: form.paperInvNo,
            itemDetails: orderItems.map((it) => ({
                name: it.name, quantity: it.quantity, unitPrice: it.unitPrice,
                service: it.service, notes: it.notes,
            })),
            notes: form.notes,
            createdBy: storedUser.name || 'Admin',
            staffName: storedUser.name || 'Admin',
            branchId: branchId,
        };

        addOrder(newOrder);

        // Add payment record
        const nextPaymentId = payments && payments.length
            ? Math.max(...payments.map((p) => Number(p.id) || 0)) + 1
            : 1;
        const newPayment = {
            id: nextPaymentId,
            orderId: orderId,
            orderNumber: orderNo,
            customer: customerObj.name,
            amount: totalAmount,
            method: method,
            status: 'Paid',
            date: new Date().toISOString().split('T')[0],
        };
        if (setPayments) setPayments((prev) => [newPayment, ...prev]);

        // Update customer order count
        setCustomers(
            customers.map((c) =>
                c.id === customerObj.id
                    ? {
                        ...c,
                        totalOrders: (c.totalOrders || 0) + 1,
                        ...(method === 'Cash' ? { balance: 0 } : {}),
                    }
                    : c
            )
        );

        if (method === 'Cash') {
            generateInvoicePDF(newOrder);
        }

        setShowSettleModal(false);
        setPaymentStep('select');
        clearDraftInvoice();
        toast.success(`✅ Invoice ${orderNo} settled via ${method}`);
        navigate('/admin/invoices');
    };

    const handleSaveAndPrint = () => {
        if (!form.customerId) {
            toast.error('Please select or add a customer');
            return;
        }

        if (orderItems.length === 0) {
            toast.error('Add at least one garment to create invoice');
            return;
        }

        const customerObj = customers.find((c) => String(c.id) === String(form.customerId));
        const orderId = Date.now();
        const branchId = (userRole === 'Admin' || userRole === 'Super Admin') ? (selectedBranch !== 'All' ? selectedBranch : null) : assignedBranch;
        const orderNo = getNextBranchOrderNo(orders, branchId, 'INV');

        const newOrder = {
            id: orderId,
            number: orderNo,
            customerId: customerObj.id,
            customerName: customerObj.name,
            serviceType: quickServiceMode,
            status: 'Waiting',
            deliveryStatus: 'Waiting',
            isHomeDelivery: form.deliveryMode === 'home',
            deliveryType: form.deliveryMode === 'home' ? 'Home Delivery' : 'Branch Pickup',
            paymentStatus: 'Pending',
            amount: subtotal,
            tax,
            taxRate,
            discount: discountAmount,
            totalAmount,
            date: new Date().toISOString().split('T')[0],
            pickupDate: new Date().toISOString().split('T')[0],
            deliveryDate: form.expectedDeliveryDate,
            paperInvoiceNo: form.paperInvNo,
            itemDetails: orderItems.map((it) => ({
                name: it.name,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                service: it.service,
                notes: it.notes,
            })),
            notes: form.notes,
            createdBy: storedUser.name || 'Admin',
            staffName: storedUser.name || 'Admin',
            branchId: branchId,
        };

        addOrder(newOrder);

        // Update customer order count
        setCustomers(
            customers.map((c) =>
                c.id === customerObj.id ? { ...c, totalOrders: (c.totalOrders || 0) + 1 } : c
            )
        );

        toast.success(`Invoice ${orderNo} saved successfully`);
        generateInvoicePDF(newOrder);
        clearDraftInvoice();
        navigate('/admin/invoices');
    };

    const handleSendToWhatsApp = (phoneNumber, invoiceMessage) => {
        const cleanPhone = phoneNumber.replace(/\D/g, "");

        if (!cleanPhone) {
            toast.error("Phone number is missing or invalid");
            return;
        }

        const encodedMessage = encodeURIComponent(invoiceMessage);
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

        window.open(whatsappUrl, "_blank");
    };

    const handleSaveAndWhatsApp = () => {
        if (!form.customerId) {
            toast.error('Please select or add a customer');
            return;
        }

        if (orderItems.length === 0) {
            toast.error('Add at least one garment to create invoice');
            return;
        }

        const customerObj = customers.find((c) => String(c.id) === String(form.customerId));
        const orderId = Date.now();
        const branchId = (userRole === 'Admin' || userRole === 'Super Admin') ? (selectedBranch !== 'All' ? selectedBranch : null) : assignedBranch;
        const orderNo = getNextBranchOrderNo(orders, branchId, 'INV');

        addOrder({
            id: orderId,
            number: orderNo,
            customerId: customerObj.id,
            customerName: customerObj.name,
            serviceType: quickServiceMode,
            status: 'Waiting',
            deliveryStatus: 'Waiting',
            isHomeDelivery: form.deliveryMode === 'home',
            deliveryType: form.deliveryMode === 'home' ? 'Home Delivery' : 'Branch Pickup',
            paymentStatus: 'Pending',
            amount: subtotal,
            tax,
            taxRate,
            discount: discountAmount,
            totalAmount,
            date: new Date().toISOString().split('T')[0],
            pickupDate: new Date().toISOString().split('T')[0],
            deliveryDate: form.expectedDeliveryDate,
            paperInvoiceNo: form.paperInvNo,
            itemDetails: orderItems.map((it) => ({
                name: it.name,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                service: it.service,
                notes: it.notes,
            })),
            notes: form.notes,
            createdBy: storedUser.name || 'Admin',
            staffName: storedUser.name || 'Admin',
            branchId: branchId,
        });

        // Update customer order count
        setCustomers(
            customers.map((c) =>
                c.id === customerObj.id ? { ...c, totalOrders: (c.totalOrders || 0) + 1 } : c
            )
        );

        toast.success(`Invoice ${orderNo} saved successfully`);

        const itemsText = orderItems.map(it => `${it.name} (${it.quantity})`).join(', ');
        const deliveryTypeText = form.deliveryMode === 'home' ? 'Home Delivery' : 'Branch Pickup';
        const waText = `Dear ${customerObj.name},\n\nInvoice Number: ${orderNo}\nOrder Items: ${itemsText}\nTotal Price: ${formatCurrency(totalAmount)}\nDelivery Type: ${deliveryTypeText}\nDelivery Status: Waiting\nExpected Delivery Date: ${form.expectedDeliveryDate}`;

        handleSendToWhatsApp(customerObj.phone, waText);
        clearDraftInvoice();
        navigate('/admin/invoices');
    };

    const locale = language === 'ar' ? 'ar-KW' : 'en-US';
    const formattedTime = currentTime.toLocaleTimeString(locale, {
        timeZone: 'Asia/Kuwait',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });

    const formattedDate = currentTime.toLocaleDateString(locale, {
        timeZone: 'Asia/Kuwait',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });

    // The selected garment for the modal
    const selectedGarment = activeGarmentIdx !== null ? catalog[activeGarmentIdx] : null;

    return (
        <div 
            className="make-invoice-container flex flex-col lg:h-full lg:overflow-hidden space-y-2 relative text-primary pb-6 lg:pb-0"
            onClickCapture={(e) => {
                if (selectedBranch === 'All') {
                    e.stopPropagation();
                    e.preventDefault();
                    toast.warning(language === 'ar' ? "الرجاء تحديد فرع أولاً" : "Please select a branch first to perform actions");
                }
            }}
            onKeyDownCapture={(e) => {
                if (selectedBranch === 'All' && (e.key === 'Enter' || e.key === ' ')) {
                    e.stopPropagation();
                    e.preventDefault();
                    toast.warning(language === 'ar' ? "الرجاء تحديد فرع أولاً" : "Please select a branch first to perform actions");
                }
            }}
        >

            {/* ===== ADD CATALOG MODAL ===== */}
            {showAddCatalogModal && (() => {
                const isLight = theme === 'light';

                return (
                    <div
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
                        style={{
                            backdropFilter: 'blur(8px)',
                            backgroundColor: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(0,0,0,0.65)'
                        }}
                        onClick={() => setShowAddCatalogModal(false)}
                    >
                        <div
                            className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                            style={{
                                background: isLight
                                    ? 'linear-gradient(145deg, #fdfaf6 0%, #fffbf0 100%)'
                                    : 'linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
                                border: isLight ? '1px solid #e8d5b0' : '1px solid rgba(255,255,255,0.1)',
                                boxShadow: isLight
                                    ? '0 30px 80px -10px rgba(120,80,20,0.18)'
                                    : '0 30px 80px -10px rgba(0,0,0,0.8)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Top accent bar */}
                            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)' }} />

                            {/* Header */}
                            <div className="px-6 pt-5 pb-4" style={{ borderBottom: isLight ? '1px solid #e8d5b0' : '1px solid rgba(255,255,255,0.1)' }}>
                                <h2 className={`text-base font-extrabold tracking-tight ${isLight ? 'text-stone-800' : 'text-white'}`}>➕ {t('counter.makeInvoice.addCustomCatalog')}</h2>
                                <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>{t('counter.makeInvoice.catalogFormSubtitle')}</p>
                            </div>

                            {/* Form Fields */}
                            <div className="px-6 pt-4 pb-3 space-y-4">
                                {/* Garment Name */}
                                <div>
                                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>{t('counter.makeInvoice.garmentName')} *</label>
                                    <input
                                        type="text"
                                        placeholder={t('counter.makeInvoice.garmentNamePlaceholder')}
                                        value={newCatalogForm.name}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setNewCatalogForm(prev => ({ ...prev, name: val, icon: getAutoIcon(val) }));
                                        }}
                                        autoFocus
                                        className={`w-full text-sm rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 ${isLight ? 'bg-white border-stone-300 text-stone-800' : 'bg-slate-800 border-slate-600 text-white'}`}
                                    />
                                </div>

                                {/* Auto Icon Preview */}
                                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${isLight ? 'bg-stone-50 border-stone-200' : 'bg-slate-800/60 border-slate-600'}`}>
                                    {newCatalogForm.image ? (
                                        <img src={newCatalogForm.image} alt="preview" className="w-10 h-10 object-cover rounded-lg shadow" />
                                    ) : (
                                        <span className="text-3xl">{newCatalogForm.icon || '👕'}</span>
                                    )}
                                    <div>
                                        <p className={`text-xs font-semibold ${isLight ? 'text-stone-700' : 'text-slate-300'}`}>
                                            {newCatalogForm.name ? getGarmentDisplayName({ name: newCatalogForm.name, category: 'custom' }) : t('counter.makeInvoice.garmentName')}
                                        </p>
                                        <p className={`text-[10px] ${isLight ? 'text-stone-400' : 'text-slate-500'}`}>
                                            {newCatalogForm.image ? t('counter.makeInvoice.customUploadedImage') : t('counter.makeInvoice.autoIconPreview')}
                                        </p>
                                    </div>
                                </div>

                                {/* Has Sizes Toggle */}
                                <div className="flex items-center gap-2 mt-4 mb-2">
                                    <input 
                                        type="checkbox" 
                                        id="newHasSizes" 
                                        checked={newCatalogForm.hasSizes || false}
                                        onChange={(e) => setNewCatalogForm(prev => ({ ...prev, hasSizes: e.target.checked, price: e.target.checked ? '' : prev.price }))}
                                        className="w-4 h-4 text-indigo-600 border-stone-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="newHasSizes" className={`text-xs font-semibold uppercase tracking-wider select-none cursor-pointer ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>{t('counter.makeInvoice.hasMultipleSizes')}</label>
                                </div>

                                {/* Conditional Price / Sizes Input */}
                                {!newCatalogForm.hasSizes ? (
                                    <div className="space-y-2">
                                        <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>
                                            {language === 'ar' ? 'أسعار الخدمات (د.ك)' : 'Service Prices (KWD)'}
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {SERVICE_PRICE_FIELDS.map(({ key, labelKey }) => (
                                                <div key={key}>
                                                    <label className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                                                        {t(`counter.makeInvoice.${labelKey}`)}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        placeholder={t('counter.makeInvoice.pricePlaceholder')}
                                                        min="0"
                                                        step="0.100"
                                                        value={newCatalogForm.prices?.[key] ?? ''}
                                                        onChange={(e) => setNewCatalogForm(prev => ({
                                                            ...prev,
                                                            prices: { ...prev.prices, [key]: e.target.value },
                                                        }))}
                                                        className={`w-full text-sm rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 font-mono ${isLight ? 'bg-white border-stone-300 text-stone-800' : 'bg-slate-800 border-slate-600 text-white'}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`space-y-2 border border-dashed p-3 rounded-xl ${isLight ? 'border-indigo-300/50 bg-indigo-50/10' : 'border-indigo-500/30 bg-indigo-900/10'}`}>
                                        <label className={`block text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>{t('counter.makeInvoice.sizesAndPrices')}</label>
                                        {(newCatalogForm.sizes || []).map((size, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input 
                                                    type="text" 
                                                    placeholder="Size (e.g. Small)" 
                                                    value={size.label}
                                                    onChange={(e) => {
                                                        const newSizes = [...newCatalogForm.sizes];
                                                        newSizes[idx].label = e.target.value;
                                                        setNewCatalogForm(prev => ({ ...prev, sizes: newSizes }));
                                                    }}
                                                    className={`flex-1 text-sm rounded-lg border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${isLight ? 'bg-white border-stone-300 text-stone-800' : 'bg-slate-800 border-slate-600 text-white'}`}
                                                />
                                                <input 
                                                    type="number" 
                                                    placeholder="Price" 
                                                    step="0.1"
                                                    min="0"
                                                    value={size.price}
                                                    onChange={(e) => {
                                                        const newSizes = [...newCatalogForm.sizes];
                                                        newSizes[idx].price = Number(e.target.value) || 0;
                                                        setNewCatalogForm(prev => ({ ...prev, sizes: newSizes }));
                                                    }}
                                                    className={`w-24 text-sm rounded-lg border px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400 ${isLight ? 'bg-white border-stone-300 text-stone-800' : 'bg-slate-800 border-slate-600 text-white'}`}
                                                />
                                                <button type="button" onClick={() => {
                                                    const newSizes = newCatalogForm.sizes.filter((_, i) => i !== idx);
                                                    setNewCatalogForm(prev => ({ ...prev, sizes: newSizes }));
                                                }} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-1.5 rounded-lg transition-colors">
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setNewCatalogForm(prev => ({ ...prev, sizes: [...(prev.sizes || []), {label: '', price: 0}] }))} className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1.5 rounded border border-indigo-200 dark:border-indigo-800 w-full transition-colors mt-1">
                                            + Add Size
                                        </button>
                                    </div>
                                )}

                                {/* Color Picker */}
                                <div>
                                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>{t('counter.makeInvoice.selectColor')}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={newCatalogForm.color || '#3b82f6'}
                                            onChange={e => setNewCatalogForm(prev => ({ ...prev, color: e.target.value }))}
                                            className="w-10 h-8 rounded border cursor-pointer bg-transparent"
                                        />
                                        <span className={`text-xs font-mono select-all ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>{newCatalogForm.color || '#3b82f6'}</span>
                                    </div>
                                </div>

                                {/* Custom Image Upload */}
                                <div>
                                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>{t('counter.makeInvoice.customImage')}</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                if (file.size > 1024 * 1024) {
                                                    toast.error("Image is too large. Please select an image under 1MB.");
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setNewCatalogForm(prev => ({ ...prev, image: reader.result }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className={`w-full text-xs ${isLight ? 'text-stone-600' : 'text-slate-400'} file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100`}
                                    />
                                    {newCatalogForm.image && (
                                        <div className="mt-2 relative inline-block">
                                            <img src={newCatalogForm.image} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-black/10" />
                                            <button
                                                type="button"
                                                onClick={() => setNewCatalogForm(prev => ({ ...prev, image: null }))}
                                                className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 flex items-center justify-center w-5 h-5 font-bold"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="px-6 pb-5 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleAddCatalogSubmit}
                                    className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
                                >
                                    ✅ {t('counter.makeInvoice.addToCatalog')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddCatalogModal(false)}
                                    className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${isLight ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ===== EDIT CATALOG MODAL ===== */}
            {showEditCatalogModal && (() => {
                const isLight = theme === 'light';
                return (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', backgroundColor: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(0,0,0,0.65)' }}>
                        <div className={`relative w-full max-w-md rounded-2xl p-5 shadow-2xl ${isLight ? 'bg-white text-slate-800' : 'bg-slate-900 border border-slate-700 text-slate-200'}`}>
                            <button onClick={() => setShowEditCatalogModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <FiX size={20} />
                            </button>
                            <h2 className="text-lg font-bold mb-4">{t('counter.makeInvoice.editGarment')}</h2>

                            {/* Live Icon Preview Chip */}
                            <div className="flex justify-center mb-4">
                                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-4 py-2 rounded-2xl border border-blue-200 dark:border-blue-800">
                                    {editCatalogForm.image ? (
                                        <img src={editCatalogForm.image} alt="preview" className="w-8 h-8 object-cover rounded-lg shadow" />
                                    ) : (
                                        <span className="text-2xl">{editCatalogForm.icon}</span>
                                    )}
                                    <span className="font-semibold">{editCatalogForm.name || 'Type a name...'}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1 opacity-70">{t('counter.makeInvoice.garmentName')} *</label>
                                    <input
                                        type="text"
                                        placeholder={t('counter.makeInvoice.garmentNamePlaceholder')}
                                        value={editCatalogForm.name}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEditCatalogForm({ ...editCatalogForm, name: val, icon: getAutoIcon(val) });
                                        }}
                                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 placeholder:text-slate-500'}`}
                                    />
                                </div>
                                {/* Has Sizes Toggle Edit */}
                                <div className="flex items-center gap-2 mt-4 mb-2">
                                    <input 
                                        type="checkbox" 
                                        id="editHasSizes" 
                                        checked={editCatalogForm.hasSizes || false}
                                        onChange={(e) => setEditCatalogForm(prev => ({ ...prev, hasSizes: e.target.checked, price: e.target.checked ? '' : prev.price }))}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="editHasSizes" className={`text-xs font-semibold uppercase tracking-wider select-none cursor-pointer opacity-70`}>{t('counter.makeInvoice.hasMultipleSizes')}</label>
                                </div>

                                {!editCatalogForm.hasSizes ? (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold mb-1 opacity-70">
                                            {language === 'ar' ? 'أسعار الخدمات (د.ك)' : 'Service Prices (KWD)'}
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {SERVICE_PRICE_FIELDS.map(({ key, labelKey }) => (
                                                <div key={key}>
                                                    <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-70">
                                                        {t(`counter.makeInvoice.${labelKey}`)}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        placeholder={t('counter.makeInvoice.pricePlaceholder')}
                                                        value={editCatalogForm.prices?.[key] ?? ''}
                                                        onChange={(e) => setEditCatalogForm(prev => ({
                                                            ...prev,
                                                            prices: { ...prev.prices, [key]: e.target.value },
                                                        }))}
                                                        className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 placeholder:text-slate-500'}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`space-y-2 border border-dashed p-3 rounded-xl ${isLight ? 'border-blue-300/50 bg-blue-50/10' : 'border-blue-500/30 bg-blue-900/10'}`}>
                                        <label className="block text-xs font-semibold opacity-70">Sizes & Prices</label>
                                        {(editCatalogForm.sizes || []).map((size, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input 
                                                    type="text" 
                                                    placeholder="Size" 
                                                    value={size.label}
                                                    onChange={(e) => {
                                                        const newSizes = [...editCatalogForm.sizes];
                                                        newSizes[idx].label = e.target.value;
                                                        setEditCatalogForm(prev => ({ ...prev, sizes: newSizes }));
                                                    }}
                                                    className={`flex-1 text-sm rounded-lg border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 ${isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-white'}`}
                                                />
                                                <input 
                                                    type="number" 
                                                    placeholder="Price" 
                                                    step="0.1"
                                                    min="0"
                                                    value={size.price}
                                                    onChange={(e) => {
                                                        const newSizes = [...editCatalogForm.sizes];
                                                        newSizes[idx].price = Number(e.target.value) || 0;
                                                        setEditCatalogForm(prev => ({ ...prev, sizes: newSizes }));
                                                    }}
                                                    className={`w-24 text-sm rounded-lg border px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 ${isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-white'}`}
                                                />
                                                <button type="button" onClick={() => {
                                                    const newSizes = editCatalogForm.sizes.filter((_, i) => i !== idx);
                                                    setEditCatalogForm(prev => ({ ...prev, sizes: newSizes }));
                                                }} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-1.5 rounded-lg transition-colors">
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setEditCatalogForm(prev => ({ ...prev, sizes: [...(prev.sizes || []), {label: '', price: 0}] }))} className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1.5 rounded border border-blue-200 dark:border-blue-800 w-full transition-colors mt-1">
                                            + Add Size
                                        </button>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-semibold mb-1 opacity-70">{t('counter.makeInvoice.selectColor')}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={editCatalogForm.color || '#3b82f6'}
                                            onChange={e => setEditCatalogForm(prev => ({ ...prev, color: e.target.value }))}
                                            className="w-10 h-8 rounded border cursor-pointer bg-transparent"
                                        />
                                        <span className="text-xs font-mono select-all opacity-80">{editCatalogForm.color || '#3b82f6'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1 opacity-70">Custom Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                if (file.size > 1024 * 1024) {
                                                    toast.error("Image is too large. Please select an image under 1MB.");
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setEditCatalogForm(prev => ({ ...prev, image: reader.result }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className={`w-full text-xs opacity-80 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100`}
                                    />
                                    {editCatalogForm.image && (
                                        <div className="mt-2 relative inline-block">
                                            <img src={editCatalogForm.image} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-black/10" />
                                            <button
                                                type="button"
                                                onClick={() => setEditCatalogForm(prev => ({ ...prev, image: null }))}
                                                className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 flex items-center justify-center w-5 h-5 font-bold"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleEditCatalogSubmit}
                                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-xl text-sm transition-colors"
                                >
                                    Update Catalog
                                </button>
                                <button
                                    onClick={() => setShowEditCatalogModal(false)}
                                    className="flex-1 font-bold py-2 rounded-xl text-sm transition-colors"
                                    style={isLight
                                        ? { background: '#fff1f2', border: '1px solid #fca5a5' }
                                        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    {t('common.cancel') || 'Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ===== SERVICE SELECTION MODAL ===== */}
            {selectedGarment && (() => {
                const isLight = theme === 'light';
                return (
                    <div
                        className="fixed inset-0 z-[999] flex items-center justify-center p-4"
                        style={{
                            backdropFilter: 'blur(8px)',
                            backgroundColor: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(0,0,0,0.65)'
                        }}
                        onClick={() => setActiveGarmentIdx(null)}
                    >
                        <div
                            className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
                            style={{
                                background: isLight
                                    ? 'linear-gradient(145deg, #fdfaf6 0%, #fffbf0 100%)'
                                    : 'linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
                                border: isLight ? '1px solid #e8d5b0' : '1px solid rgba(255,255,255,0.1)',
                                boxShadow: isLight
                                    ? '0 30px 80px -10px rgba(120,80,20,0.18), 0 0 0 1px rgba(232,213,176,0.6)'
                                    : '0 30px 80px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Top accent bar — same in both modes */}
                            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #8b5cf6)' }} />

                            {/* Garment Info Header */}
                            <div
                                className="px-6 pt-6 pb-4 text-center"
                                style={{ borderBottom: isLight ? '1px solid #e8d5b0' : '1px solid rgba(255,255,255,0.1)' }}
                            >
                                {selectedGarment.image ? (
                                    <div className="flex justify-center mb-3">
                                        <img src={selectedGarment.image} alt={selectedGarment.name} className="w-16 h-16 object-cover rounded-2xl shadow-md border border-black/10" />
                                    </div>
                                ) : (
                                    <div className="text-5xl mb-3" role="img" aria-label={selectedGarment.name}>
                                        {selectedGarment.icon}
                                    </div>
                                )}
                                <h2 className={`text-lg font-extrabold tracking-tight ${isLight ? 'text-stone-800' : 'text-white'}`}>
                                    {selectedGarment.category === 'custom' || selectedGarment.isNameEdited ? selectedGarment.name : (t(`counter.makeInvoice.${selectedGarment.key}`) || selectedGarment.name)}
                                </h2>
                                <p className={`text-sm mt-0.5 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                                    {t('counter.makeInvoice.garmentBasePrice') || 'Base price'}:{' '}
                                    <span className={`font-mono font-bold ${isLight ? 'text-amber-700' : 'text-cyan-400'}`}>
                                        {formatCurrency(selectedGarment.price)}
                                    </span>
                                </p>
                                <p className={`text-xs mt-2 font-medium ${isLight ? 'text-stone-400' : 'text-slate-500'}`}>
                                    {t('counter.makeInvoice.selectServicePrompt') || 'Select a service type to add this item'}
                                </p>
                            </div>

                            {/* Service Buttons */}
                            <div className="p-5 flex flex-col gap-3">
                                {/* Normal / Wash & Iron */}
                                <button
                                    type="button"
                                    onClick={() => { addGarment(selectedGarment, 'Normal'); setActiveGarmentIdx(null); }}
                                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                    style={isLight
                                        ? { background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)', border: '1px solid #1d4ed8', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }
                                        : { background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(29,78,216,0.25) 100%)', border: '1px solid rgba(59,130,246,0.35)' }}
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                                        style={{ background: isLight ? 'rgba(255,255,255,0.2)' : 'rgba(59,130,246,0.2)' }}>🫧</div>
                                    <div className="text-left flex-1">
                                        <div className={`text-sm font-bold ${isLight ? 'text-white' : 'text-blue-300'}`}>
                                            {t('counter.makeInvoice.normalService') || 'Normal / Wash & Iron'}
                                        </div>
                                        <div className={`text-xs mt-0.5 ${isLight ? 'text-blue-100' : 'text-blue-400/60'}`}>
                                            {formatCurrency(selectedGarment.price)}
                                        </div>
                                    </div>
                                    <div className={`opacity-70 text-lg ${isLight ? 'text-white' : 'text-blue-400'}`}>›</div>
                                </button>

                                {/* Iron Only */}
                                <button
                                    type="button"
                                    onClick={() => { addGarment(selectedGarment, 'Iron Only'); setActiveGarmentIdx(null); }}
                                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                    style={isLight
                                        ? { background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', border: '1px solid #b45309', boxShadow: '0 4px 14px rgba(217,119,6,0.3)' }
                                        : { background: 'linear-gradient(135deg, rgba(217,119,6,0.15) 0%, rgba(180,83,9,0.25) 100%)', border: '1px solid rgba(245,158,11,0.35)' }}
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                                        style={{ background: isLight ? 'rgba(255,255,255,0.2)' : 'rgba(245,158,11,0.2)' }}>♨️</div>
                                    <div className="text-left flex-1">
                                        <div className={`text-sm font-bold ${isLight ? 'text-white' : 'text-amber-300'}`}>
                                            {t('counter.makeInvoice.ironOnlyService') || 'Iron Only'}
                                        </div>
                                        <div className={`text-xs mt-0.5 ${isLight ? 'text-amber-100' : 'text-amber-400/60'}`}>
                                            {formatCurrency(selectedGarment.price)}
                                        </div>
                                    </div>
                                    <div className={`opacity-70 text-lg ${isLight ? 'text-white' : 'text-amber-400'}`}>›</div>
                                </button>

                                {/* Dry Cleaning */}
                                <button
                                    type="button"
                                    onClick={() => { addGarment(selectedGarment, 'Dry Cleaning'); setActiveGarmentIdx(null); }}
                                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                    style={isLight
                                        ? { background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', border: '1px solid #6d28d9', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }
                                        : { background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(109,40,217,0.25) 100%)', border: '1px solid rgba(139,92,246,0.35)' }}
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                                        style={{ background: isLight ? 'rgba(255,255,255,0.2)' : 'rgba(139,92,246,0.2)' }}>✨</div>
                                    <div className="text-left flex-1">
                                        <div className={`text-sm font-bold ${isLight ? 'text-white' : 'text-purple-300'}`}>
                                            {t('counter.makeInvoice.dryCleanService') || 'Dry Cleaning Only'}
                                        </div>
                                        <div className={`text-xs mt-0.5 ${isLight ? 'text-purple-100' : 'text-purple-400/60'}`}>
                                            {formatCurrency(selectedGarment.price)}
                                        </div>
                                    </div>
                                    <div className={`opacity-70 text-lg ${isLight ? 'text-white' : 'text-purple-400'}`}>›</div>
                                </button>
                            </div>

                            {/* Cancel Footer */}
                            <div className="px-5 pb-5">
                                <button
                                    type="button"
                                    onClick={() => setActiveGarmentIdx(null)}
                                    className={`w-full py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${isLight
                                        ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-100'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                    style={isLight
                                        ? { background: '#fff1f2', border: '1px solid #fca5a5' }
                                        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    {t('common.cancel') || 'Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* SECTION 3: Main Split Content Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-0 lg:overflow-hidden">
                <div className="lg:col-span-7 flex flex-col gap-2 min-h-0 min-w-0">

            {/* SECTION 1: POS Top Controls Row */}
            <div className="grid grid-cols-1 xl:grid-cols-7 gap-2 shrink-0">

                {/* LED Final Price Display */}
                <div className="xl:col-span-3 bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-inner">
                    <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                        <span>{t('counter.makeInvoice.totalPriceLabel') || "TOTAL PRICE"} ({orderItems.reduce((acc, it) => acc + it.quantity, 0)} {t('counter.makeInvoice.itemsLabel') || "items"})</span>
                        <span className="text-slate-500 font-mono">{t('counter.makeInvoice.subtotalLabel') || "SUB"}: {formatCurrency(subtotal)}</span>
                    </div>
                    <div className="mt-2 text-right">
                        <span className="font-mono text-2xl xl:text-3xl font-extrabold text-green-500 tracking-wider drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
                            {formatCurrency(totalAmount)}
                        </span>
                    </div>
                </div>

                {/* Form Inputs (Customer and Service Info) */}
                <div className="xl:col-span-4 surface-card border border-border rounded-2xl p-3 grid grid-cols-2 gap-2 shadow-md">
                    {/* Customer Search & Selector */}
                    <div className="relative col-span-2 sm:col-span-1" ref={customerDropdownRef}>
                        <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-0.5">
                            {t('counter.makeInvoice.selectCustomer') || "Select Customer"} *
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('counter.makeInvoice.typeNameOrPhone') || "Type Name or Phone..."}
                                value={customerInputDisplay}
                                onChange={(e) => {
                                    setCustomerSearchQuery(e.target.value);
                                    setShowSearchResults(true);
                                }}
                                onFocus={() => {
                                    setShowSearchResults(true);
                                    if (selectedCustomerObj && customerSearchQuery === '') {
                                        setCustomerSearchQuery('');
                                    }
                                }}
                                className={`w-full text-xs rounded-lg border bg-surface pl-8 pr-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                                    selectedCustomerObj && !showSearchResults && customerSearchQuery === ''
                                        ? 'border-emerald-400/60 text-primary font-medium'
                                        : 'border-border'
                                }`}
                            />
                            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none" />
                        </div>

                        {/* Live Autocomplete Results */}
                        {showSearchResults && (
                            <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-surface border border-border rounded-lg shadow-xl z-50">
                                {filteredCustomersList.length > 0 ? (
                                    filteredCustomersList.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleSelectCustomer(c)}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-surface-alt border-b border-border/40 flex justify-between items-center"
                                        >
                                            <span className="font-semibold text-primary">{language === 'ar' && c.arabicName?.trim() ? c.arabicName : c.name}</span>
                                            <span className="text-secondary font-mono text-[10px]">{c.phone}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-xs text-secondary">
                                        {t('counter.makeInvoice.noCustomerMatch') || "No customer matches query."}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Display selected details */}
                        {selectedCustomerObj && (
                            <div className="mt-1 space-y-1">
                                <p className="text-[11px] text-emerald-500 truncate font-medium">
                                    {t('counter.makeInvoice.selectedLabel') || "Selected"}: {getCustomerDisplayName(selectedCustomerObj)} ({selectedCustomerObj.phone})
                                </p>
                                <p className={`text-[11px] font-bold ${Number(selectedCustomerObj.balance || 0) > 0 ? 'text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded inline-block border border-rose-500/10' : 'text-secondary'}`}>
                                    {t('counter.makeInvoice.dueBalance')}: {formatCurrency(selectedCustomerObj.balance || 0)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Quick Phone Search */}
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-0.5">
                            {t('counter.makeInvoice.lookupPhone') || "Lookup Phone No"}
                        </label>
                        <div className="flex gap-1.5 min-w-0">
                            <input
                                type="tel"
                                name="phoneSearch"
                                placeholder={t('counter.makeInvoice.phoneNoPlaceholder') || "Phone No..."}
                                value={form.phoneSearch}
                                onChange={(e) => setForm((prev) => ({ ...prev, phoneSearch: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                                className="min-w-0 flex-1 text-xs rounded-lg border border-border bg-surface px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                            />
                            <button
                                type="button"
                                onClick={handlePhoneSearch}
                                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition"
                                title={t('counter.makeInvoice.searchPhoneTooltip') || "Search Phone Number"}
                            >
                                &gt;&gt;
                            </button>
                        </div>
                    </div>
                </div>



            </div>

            {/* Delivery Method — separate from service selection */}
            <div className="surface-card border border-border rounded-2xl p-2.5 flex flex-wrap items-center gap-2 shrink-0 shadow-sm">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider shrink-0">
                    {t('counter.makeInvoice.deliveryType')}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (orderItems.length > 0) {
                                toast.warning(language === 'ar' ? 'لا يمكن تغيير نوع التوصيل بعد إضافة عناصر إلى الفاتورة. يرجى مسح العناصر أولاً.' : 'Cannot change delivery type after items are added to invoice. Please clear items first.');
                                return;
                            }
                            setForm((prev) => ({ ...prev, deliveryMode: 'branch' }));
                        }}
                        className={`text-[11px] font-black px-4 py-2 rounded-xl transition-all whitespace-nowrap border ${
                            orderItems.length > 0 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                        } ${
                            form.deliveryMode !== 'home'
                                ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                                : 'bg-white border-slate-300 text-black hover:bg-blue-50 hover:border-blue-300 dark:bg-slate-100 dark:border-slate-300 dark:text-black dark:hover:bg-blue-100'
                        }`}
                    >
                        🏪 {t('counter.makeInvoice.branchPickup')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (orderItems.length > 0) {
                                toast.warning(language === 'ar' ? 'لا يمكن تغيير نوع التوصيل بعد إضافة عناصر إلى الفاتورة. يرجى مسح العناصر أولاً.' : 'Cannot change delivery type after items are added to invoice. Please clear items first.');
                                return;
                            }
                            setForm((prev) => ({ ...prev, deliveryMode: 'home' }));
                        }}
                        className={`text-[11px] font-black px-4 py-2 rounded-xl transition-all whitespace-nowrap border ${
                            orderItems.length > 0 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                        } ${
                            form.deliveryMode === 'home'
                                ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                                : 'bg-white border-slate-300 text-black hover:bg-emerald-50 hover:border-emerald-300 dark:bg-slate-100 dark:border-slate-300 dark:text-black dark:hover:bg-emerald-100'
                        }`}
                    >
                        🏠 {t('counter.makeInvoice.homeDelivery')}
                    </button>
                </div>
            </div>


                {/* Left Column: Garments Grid Catalog */}
                <div className="bg-surface border border-border rounded-2xl p-2.5 flex flex-col min-h-0 shadow-lg">
                    <div className="flex flex-wrap xl:flex-nowrap justify-between items-start xl:items-center mb-2 pb-2 border-b border-border/50 shrink-0 gap-2 overflow-visible relative z-20">
                        <div className="flex items-center gap-2 max-w-full min-w-0 flex-1">
                            {/* Dynamic Status Logo */}
                            {quickServiceMode?.includes('Express') ? (
                                <div className="flex flex-col items-center justify-center bg-gradient-to-br from-red-500 to-rose-600 text-white px-4 py-2.5 rounded-xl shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-400 w-auto min-w-[88px] h-16 shrink-0 animate-pulse">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[14px]">⚡</span>
                                        <span className="text-[12px] font-black tracking-widest text-white drop-shadow-md">{t('counter.makeInvoice.expressLabel')}</span>
                                    </div>
                                    <div className="flex gap-1.5 mt-0.5 opacity-95 text-[11px]">
                                        <span>🫧</span>
                                        <span>💨</span>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="group relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 text-white px-4 py-2.5 rounded-xl shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-300/40 w-auto min-w-[92px] h-16 shrink-0 transition-all duration-300 hover:scale-[1.06] hover:shadow-[0_6px_22px_rgba(37,99,235,0.55)] active:scale-[0.98] cursor-pointer"
                                    title={quickServiceMode || t('counter.makeInvoice.normalServiceShort')}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <span className="relative text-[12px] font-black tracking-[0.22em] text-white uppercase leading-none drop-shadow-md">
                                        {t('counter.makeInvoice.normalLabel')}
                                    </span>
                                    <div className="relative flex items-center gap-2 mt-1.5">
                                        <span className="text-[14px] transition-transform duration-300 group-hover:scale-125 group-hover:-translate-y-0.5">🫧</span>
                                        <span className="text-[11px] text-blue-100/80 font-bold">+</span>
                                        <span className="text-[14px] transition-transform duration-300 group-hover:scale-125 group-hover:-translate-y-0.5 delay-75">💨</span>
                                    </div>
                                </div>
                            )}

                            {/* Service Buttons Row */}
                            <div className="flex items-center gap-1.5 bg-surface-alt/75 border border-border/60 p-1.5 rounded-xl overflow-x-auto min-w-0 min-h-[64px]">
                                {services?.filter(s => s.status === 'Active').map((service) => (
                                    <button
                                        key={service.id}
                                        type="button"
                                        onClick={() => setQuickServiceMode(service.name)}
                                        className={`text-[11px] font-black px-3 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap border ${
                                            quickServiceMode === service.name
                                                ? 'bg-purple-600 border-purple-700 text-white shadow-sm'
                                                : 'bg-white border-slate-300 text-black hover:bg-purple-50 hover:border-purple-300 dark:bg-slate-100 dark:border-slate-300 dark:text-black dark:hover:bg-purple-100'
                                        }`}
                                    >
                                        {getTranslatedServiceMode(service.name)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0" ref={catalogMenuRef}>
                            <div className="relative">
                                <button 
                                    type="button" 
                                    onClick={() => setIsCatalogMenuOpen(!isCatalogMenuOpen)} 
                                    className="p-1.5 rounded-lg hover:bg-surface-alt border border-transparent hover:border-border/50 text-secondary transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                                </button>
                                
                                {isCatalogMenuOpen && (
                                    <div
                                        className="catalog-menu-dropdown absolute end-0 top-full mt-1 min-w-[14rem] w-max bg-surface border border-border shadow-xl rounded-xl z-[200] py-1"
                                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                                    >
                                        <button 
                                            type="button" 
                                            onClick={() => { setShowAddCatalogModal(true); setIsCatalogMenuOpen(false); }} 
                                            className="w-full text-start px-3 py-2.5 text-xs hover:bg-surface-alt font-semibold text-slate-600 flex items-center gap-2 transition-colors whitespace-nowrap"
                                        >
                                            ➕ {t('counter.makeInvoice.addCatalog')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditCatalogMode(prev => !prev);
                                                if (removeCatalogMode) setRemoveCatalogMode(false);
                                                setIsCatalogMenuOpen(false);
                                            }}
                                            className={`w-full text-start px-3 py-2.5 text-xs hover:bg-surface-alt font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${editCatalogMode ? 'text-amber-600 bg-amber-50' : 'text-slate-600'}`}
                                        >
                                            {editCatalogMode ? `✖ ${t('counter.makeInvoice.doneEditing')}` : `✏️ ${t('counter.makeInvoice.editCatalog')}`}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRemoveCatalogMode(prev => !prev);
                                                if (editCatalogMode) setEditCatalogMode(false);
                                                setIsCatalogMenuOpen(false);
                                            }}
                                            className={`w-full text-start px-3 py-2.5 text-xs hover:bg-surface-alt font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${removeCatalogMode ? 'text-rose-600 bg-rose-50' : 'text-slate-600'}`}
                                        >
                                            {removeCatalogMode ? `✖ ${t('counter.makeInvoice.doneRemoving')}` : `🗑️ ${t('counter.makeInvoice.removeCatalog')}`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Scrolling Grid */}
                    <div className="flex-1 overflow-y-auto pr-1">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2 p-0.5">
                            {catalog.map((g, idx) => {
                                const styleCard = CARD_COLORS[idx % CARD_COLORS.length];
                                const isRemovable = removeCatalogMode;
                                const isEditable = editCatalogMode;
                                return (
                                    <button
                                        key={`${g.name}-${idx}`}
                                        type="button"
                                        onClick={() => {
                                            if (isRemovable) removeCatalogItem(idx);
                                            else if (isEditable) {
                                                setEditCatalogForm({
                                                    idx,
                                                    name: g.name,
                                                    icon: g.icon,
                                                    price: g.price,
                                                    prices: g.prices || {
                                                        expressIroning: g.price ?? '',
                                                        expressWashIron: g.price ?? '',
                                                        normalIroning: g.price ?? '',
                                                        normalWashIron: g.price ?? '',
                                                    },
                                                    color: g.color || '#3b82f6',
                                                    image: g.image || null,
                                                    hasSizes: g.hasSizes || false,
                                                    sizes: g.sizes || [],
                                                });
                                                setShowEditCatalogModal(true);
                                            } else {
                                                const key = String(g.key || '').toLowerCase();
                                                const name = String(g.name || '').toLowerCase();
                                                const needsModifier =
                                                  key === 'ghotraa' ||
                                                  name === 'ghotraa' ||
                                                  key === 'shmage' ||
                                                  name === 'shmage' ||
                                                  key === 'shmagespecial' ||
                                                  name === 'shmage (special)';

                                                if (key === 'carpet' || name === 'carpet') {
                                                    setSelectedGarmentForCarpet(g);
                                                    setCarpetHeightM('');
                                                    setCarpetWidthM('');
                                                } else if (needsModifier) {
                                                    setSelectedGarmentForModifier(g);
                                                    setModifierForm({ neel: false, colorChoice: '', fold: 'Normal', starch: 'Without' });
                                                } else if (g.hasSizes && g.sizes && g.sizes.length > 0) {
                                                    setSelectedGarmentForSize(g);
                                                } else {
                                                    addGarment(g, quickServiceMode);
                                                }
                                            }
                                        }}
                                        className={`relative w-full flex flex-col items-center justify-between p-2.5 border rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${styleCard} ${isRemovable ? 'ring-2 ring-rose-400 animate-pulse' : ''} ${isEditable ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
                                    >
                                        {/* Color dot indicator */}
                                        <span
                                            className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full border border-white/85 shadow-sm"
                                            style={{ backgroundColor: g.color || '#3b82f6' }}
                                        />
                                        {isRemovable && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md z-10">✖</span>
                                        )}
                                        {isEditable && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md z-10">✏️</span>
                                        )}
                                        {g.image ? (
                                            <img src={g.image} alt={g.name} className="w-10 h-10 object-cover rounded-xl mb-1 shadow-sm border border-black/10" />
                                        ) : (
                                            <span className="text-2xl mb-1" role="img" aria-label={g.name}>
                                                {g.icon}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-semibold text-center leading-tight tracking-wide truncate w-full mb-1">
                                            {getGarmentDisplayName(g)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                </div>

                {/* Right Column: Invoice items table + Discount/Totals */}
                <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-2.5 flex flex-col min-h-0 shadow-lg justify-between lg:overflow-hidden">

                    {/* Top Panel: Selected Items Title */}
                    <div className="flex justify-between items-center mb-2 pb-1 border-b border-border/50 shrink-0">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-secondary">
                            {t('counter.makeInvoice.invoiceItems') || "Invoice Items"}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setOrderItems([])}
                            className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold uppercase tracking-wider"
                        >
                            {t('counter.makeInvoice.clearAll') || "Clear All"}
                        </button>
                    </div>

                    {/* Table Container - Scrollable */}
                    <div className="flex-1 overflow-y-auto min-h-0 mb-3 border border-border/40 rounded-xl bg-surface-alt/20">
                        {orderItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                <span className="text-3xl mb-2">🧺</span>
                                <p className="text-xs text-secondary font-medium">{t('counter.makeInvoice.emptyInvoiceText') || "Invoice is empty."}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{t('counter.makeInvoice.emptyInvoiceSubtext') || "Click items in the catalog to add them."}</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-surface-alt/75 text-secondary border-b border-border/80 font-bold">
                                        <th className="p-2 w-6/12">{t('counter.makeInvoice.itemServiceHeader') || "Item / Service"}</th>
                                        <th className="p-2 w-2/12 text-center">{t('counter.makeInvoice.qtyHeader') || "Qty"}</th>
                                        <th className="p-2 w-3/12 text-right">{t('counter.makeInvoice.totalHeader') || "Total"}</th>
                                        <th className="p-2 w-1/12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderItems.map((item, idx) => (
                                        <tr key={item.id || `${item.name}-${idx}`} className="border-b border-border/30 hover:bg-surface-alt/30 transition-colors">
                                            <td className="p-2">
                                                <div className="font-semibold text-primary break-words leading-tight">{getTranslatedItemName(item.name)}</div>
                                                <div className="text-[9px] text-secondary font-semibold italic">{getTranslatedServiceMode(item.service)}</div>
                                                <input
                                                    type="text"
                                                    placeholder={t('counter.makeInvoice.addNotesPlaceholder') || "Add notes..."}
                                                    value={item.notes}
                                                    onChange={(e) => updateItemNotes(idx, e.target.value)}
                                                    className="w-full mt-1 bg-surface border border-border/50 rounded px-1.5 py-0.5 text-[9px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <div className="inline-flex items-center justify-center bg-surface border border-border/60 rounded-lg overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(idx, -1)}
                                                        className="px-2 py-1 hover:bg-surface-alt font-extrabold text-secondary"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="px-2 font-mono font-bold text-primary">{item.quantity}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(idx, 1)}
                                                        className="px-2 py-1 hover:bg-surface-alt font-extrabold text-secondary"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right font-mono font-bold text-primary">
                                                {editingLineTotalIdx === idx ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.001"
                                                            value={editingLineTotalValue}
                                                            onChange={(e) => setEditingLineTotalValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveEditedLineTotal(idx);
                                                                if (e.key === 'Escape') {
                                                                    setEditingLineTotalIdx(null);
                                                                    setEditingLineTotalValue('');
                                                                }
                                                            }}
                                                            className="w-24 rounded border border-border bg-surface px-1.5 py-1 text-right text-[11px] font-mono"
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => saveEditedLineTotal(idx)}
                                                            className="text-emerald-600 hover:text-emerald-700"
                                                            title={language === 'ar' ? 'حفظ' : 'Save'}
                                                        >
                                                            <FiCheck size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditLineTotal(idx)}
                                                        className="font-mono font-bold text-primary hover:text-blue-600 underline decoration-dotted underline-offset-4"
                                                        title={language === 'ar' ? 'اضغط للتعديل' : 'Click to edit'}
                                                    >
                                                        {formatCurrency(item.quantity * item.unitPrice)}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="text-rose-500 hover:text-rose-600 transition"
                                                    title={t('counter.makeInvoice.removeItemTooltip') || "Remove item"}
                                                >
                                                    <FiTrash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Bottom Panel: Calculation Summary & Save Bar (Shrinkable) */}
                    <div className="border-t border-border/50 pt-2 shrink-0 space-y-2">

                        {/* Discount Widget Section */}
                        <div className="bg-surface-alt/40 border border-border/60 rounded-xl p-2.5 grid grid-cols-12 gap-2 items-center text-xs">
                            <div className="col-span-3 flex items-center gap-1.5">
                                <input
                                    type="checkbox"
                                    id="discountChecked"
                                    checked={form.discountChecked}
                                    onChange={(e) => setForm((prev) => ({ ...prev, discountChecked: e.target.checked }))}
                                    className="rounded border-border text-blue-500 focus:ring-blue-400/40 h-3.5 w-3.5"
                                />
                                <label htmlFor="discountChecked" className="font-semibold text-secondary select-none">
                                    {t('counter.makeInvoice.discountLabel') || "Discount"}
                                </label>
                            </div>

                            {form.discountChecked ? (
                                <>
                                    <div className="col-span-4 flex items-center gap-1">
                                        <span className="text-[10px] text-slate-500">%</span>
                                        <input
                                            type="number"
                                            placeholder={t('counter.makeInvoice.percentLabel') || "Percent"}
                                            min="0"
                                            max="100"
                                            value={form.discountPercent || ''}
                                            onChange={(e) => setForm((prev) => ({ ...prev, discountPercent: Math.max(0, Number(e.target.value)) }))}
                                            className="w-full text-xs rounded border border-border/65 bg-surface px-1.5 py-1 text-center font-mono"
                                        />
                                    </div>
                                    <div className="col-span-5 flex items-center gap-1">
                                        <span className="text-[10px] text-slate-500">{language === 'ar' ? 'د.ك' : 'KWD'}</span>
                                        <input
                                            type="number"
                                            placeholder={t('counter.makeInvoice.valueLabel') || "Value"}
                                            min="0"
                                            step="0.05"
                                            value={form.discountValue || ''}
                                            onChange={(e) => setForm((prev) => ({ ...prev, discountValue: Math.max(0, Number(e.target.value)) }))}
                                            className="w-full text-xs rounded border border-border/65 bg-surface px-1.5 py-1 text-center font-mono"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="col-span-9 text-[10px] text-slate-500 text-right font-medium">
                                    {t('counter.makeInvoice.discountHint') || "Enable checkbox to apply discount"}
                                </div>
                            )}
                        </div>

                        {/* Subtotal, Discount & Tax lines */}
                        <div className="grid grid-cols-2 gap-y-1 text-xs px-1 font-medium">
                            <div className="text-secondary">{t('counter.makeInvoice.subtotalLabel') || "Subtotal"}:</div>
                            <div className="text-right font-mono text-primary">{formatCurrency(subtotal)}</div>
                            {form.discountChecked && (
                                <>
                                    <div className="text-rose-500 font-semibold">{t('counter.makeInvoice.discountLabel') || "Discount"}:</div>
                                    <div className="text-right font-mono text-rose-500 font-semibold">
                                        -{formatCurrency(discountAmount)}
                                    </div>
                                </>
                            )}

                        </div>



                        {/* Action Save/Reset Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="flex-1 min-w-[80px] bg-surface border border-border hover:bg-surface-alt text-primary font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition-all duration-200"
                            >
                                {t('counter.makeInvoice.resetButton') || "Reset"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { if (validateInvoice()) setShowSettleModal(true); }}
                                className="flex-1 min-w-[110px] font-bold py-2 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 text-white"
                                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}
                            >
                                💳 {t('counter.makeInvoice.settleAndPay')}
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAndPrint}
                                className="flex-1 min-w-[110px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                {t('counter.makeInvoice.printButton') || "Print Invoice"}
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAndWhatsApp}
                                className="flex-1 min-w-[130px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                {t('counter.makeInvoice.sendToWhatsApp')}
                            </button>
                        </div>

                    </div>

                </div>

            </div>

            {/* SECTION 4: POS System State Info Footer */}
            <div className="bg-surface-alt/70 border border-border rounded-xl px-4 py-2 shrink-0 flex justify-between items-center text-[10px] text-secondary font-mono tracking-wider shadow-inner">
                <div className="flex items-center gap-4">
                    <span>{t('counter.makeInvoice.userNoLabel') || "USER NO"}: <b className="text-primary font-semibold">247</b></span>
                    <span>{t('counter.makeInvoice.userNameLabel') || "USER NAME"}: <b className="text-primary font-semibold">{storedUser.name || 'Evan Wu'}</b></span>
                    <span>{t('counter.makeInvoice.branchLabel') || "BRANCH"}: <b className="text-primary font-semibold">RG</b></span>
                    <span>{t('counter.makeInvoice.yearLabel') || "YEAR"}: <b className="text-primary font-semibold">2026</b></span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-widest text-[9px]">
                        {t('counter.makeInvoice.receiptSystemLabel') || "Receipt System (نظام الإستلام)"}
                    </span>
                    <span className="text-primary font-semibold">
                        {formattedTime} - {formattedDate}
                    </span>
                </div>
            </div>

            {/* ===== SETTLE & PAY MODAL ===== */}
            {showSettleModal && (
                <div className="fixed -inset-4 z-[2000] flex items-center justify-center p-4 sm:p-6" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15,23,42,0.45)' }}>
                    <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border bg-surface text-primary" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-lg font-extrabold tracking-tight">
                                    {paymentStep === 'select' && `💳 ${t('counter.makeInvoice.settleAndPay')}`}
                                    {paymentStep === 'card' && `💳 ${t('counter.makeInvoice.cardPayment')}`}
                                    {paymentStep === 'link' && `🔗 ${t('counter.makeInvoice.linkPayment')}`}
                                    {paymentStep === 'wamt' && `💰 ${t('counter.makeInvoice.creditPayment')}`}
                                </h2>
                                <button
                                    onClick={() => { setShowSettleModal(false); setPaymentStep('select'); }}
                                    className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none"
                                >✕</button>
                            </div>
                            <p className="text-xs mb-5 text-secondary">
                                Total: <span className="font-mono font-bold text-emerald-500">{formatCurrency(totalAmount)}</span>
                                {paymentStep !== 'select' && (
                                    <button onClick={() => setPaymentStep('select')} className="ml-3 text-blue-500 hover:underline text-[11px]">← {t('counter.makeInvoice.back')}</button>
                                )}
                            </p>

                            {/* ── STEP: SELECT ── */}
                            {paymentStep === 'select' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { method: t('counter.makeInvoice.paymentCash'), icon: '💵', bg: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(16,185,129,0.4)', step: null, payMethod: 'Cash' },
                                        { method: t('counter.makeInvoice.paymentCard'), icon: '💳', bg: 'linear-gradient(135deg,#3b82f6,#4f46e5)', shadow: 'rgba(59,130,246,0.4)', step: 'card', payMethod: 'Card' },
                                        { method: t('counter.makeInvoice.paymentLink'), icon: '🔗', bg: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: 'rgba(245,158,11,0.4)', step: 'link', payMethod: 'Link' },
                                        { method: t('counter.makeInvoice.paymentCredit'), icon: '💰', bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', shadow: 'rgba(139,92,246,0.4)', step: 'wamt', payMethod: 'Credit' },
                                    ].map(({ method, icon, bg, shadow, step, payMethod }) => (
                                        <button
                                            key={payMethod}
                                            type="button"
                                            onClick={() => step ? setPaymentStep(step) : handleSettleAndPay(payMethod)}
                                            className="relative flex flex-col items-center justify-center p-4 rounded-2xl text-white transition-all hover:-translate-y-1 active:scale-95 group overflow-hidden"
                                            style={{ background: bg, boxShadow: `0 8px 20px -5px ${shadow}` }}
                                        >
                                            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{icon}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{method}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* ── CARD ── */}
                            {paymentStep === 'card' && (
                                <div className="space-y-3">
                                    <div className="relative rounded-2xl p-5 text-white overflow-hidden mb-4" style={{ background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', minHeight: '130px' }}>
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-semibold tracking-widest opacity-70">{t('counter.makeInvoice.creditDebit')}</span>
                                            <span className="text-2xl">💳</span>
                                        </div>
                                        <p className="mt-3 text-lg font-mono tracking-[0.2em] font-bold">
                                            {cardForm.number ? cardForm.number.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                                        </p>
                                        <div className="flex justify-between mt-3">
                                            <p className="text-xs font-semibold tracking-wider">{cardForm.name || t('counter.makeInvoice.cardHolder')}</p>
                                            <p className="text-xs font-semibold tracking-wider">{cardForm.expiry || 'MM/YY'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-secondary uppercase tracking-wider">{t('counter.makeInvoice.nameOnCard')}</label>
                                        <input className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40" placeholder="e.g. John Doe" value={cardForm.name} onChange={(e) => setCardForm(f => ({ ...f, name: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-secondary uppercase tracking-wider">{t('counter.makeInvoice.cardNumber')}</label>
                                        <input className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40" placeholder="1234 5678 9012 3456" maxLength={19} value={cardForm.number} onChange={(e) => { const raw = e.target.value.replace(/\D/g, '').slice(0, 16); setCardForm(f => ({ ...f, number: raw })); }} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">{t('counter.makeInvoice.expiry')}</label>
                                            <input className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40" placeholder="MM/YY" maxLength={5} value={cardForm.expiry} onChange={(e) => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2); setCardForm(f => ({ ...f, expiry: v })); }} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">{t('counter.makeInvoice.cvv')}</label>
                                            <input type="password" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40" placeholder="•••" maxLength={4} value={cardForm.cvv} onChange={(e) => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g,'').slice(0,4) }))} />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!cardForm.name.trim()) { toast.error('Enter name on card'); return; }
                                            if (cardForm.number.length < 16) { toast.error('Enter valid 16-digit card number'); return; }
                                            if (cardForm.expiry.length < 5) { toast.error('Enter valid expiry MM/YY'); return; }
                                            if (cardForm.cvv.length < 3) { toast.error('Enter valid CVV'); return; }
                                            handleSettleAndPay('Card');
                                        }}
                                        className="w-full mt-2 py-3 rounded-2xl font-bold text-white text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-95"
                                        style={{ background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', boxShadow: '0 6px 18px rgba(59,130,246,0.4)' }}
                                    >
                                        💳 Pay {formatCurrency(totalAmount)}
                                    </button>
                                </div>
                            )}

                            {/* ── STEP: LINK ── */}
                            {paymentStep === 'link' && (
                                <div className="space-y-4 mt-2">
                                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                        <span className="text-4xl mb-2">🔗</span>
                                        <p className="text-sm font-semibold text-primary">Pay with Link</p>
                                        <p className="text-xs text-secondary text-center mt-1">Fast, secure, 1-click checkout by Stripe.</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Link Account Email</label>
                                        <input
                                            type="email"
                                            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                                            placeholder="e.g. user@example.com"
                                            value={linkForm.email}
                                            onChange={(e) => setLinkForm({ email: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!linkForm.email.includes('@')) { toast.error('Enter a valid email'); return; }
                                            handleSettleAndPay('Link');
                                        }}
                                        className="w-full mt-2 py-3 rounded-2xl font-bold text-white text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-95"
                                        style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.4)' }}
                                    >
                                        🔗 Pay {formatCurrency(totalAmount)}
                                    </button>
                                </div>
                            )}

                            {/* ── STEP: CREDIT ── */}
                            {paymentStep === 'wamt' && (
                                <div className="space-y-4 mt-2">
                                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                                        <span className="text-4xl mb-2">💰</span>
                                        <p className="text-sm font-semibold text-primary">Credit Payment</p>
                                        <p className="text-xs text-secondary text-center mt-1">Directly charge customer's mobile wallet.</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Wallet Mobile Number</label>
                                        <input
                                            type="tel"
                                            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                                            placeholder="e.g. 965 xxxx xxxx"
                                            value={wamtForm.mobile}
                                            onChange={(e) => setWamtForm({ mobile: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (wamtForm.mobile.length < 5) { toast.error('Enter a valid mobile number'); return; }
                                            handleSettleAndPay('Credit');
                                        }}
                                        className="w-full mt-2 py-3 rounded-2xl font-bold text-white text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-95"
                                        style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', boxShadow: '0 6px 18px rgba(139,92,246,0.4)' }}
                                    >
                                        💰 Pay {formatCurrency(totalAmount)}
                                    </button>
                                </div>
                            )}

                            <p className={`text-center text-[10px] mt-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                Secured payment • Invoice saved on completion
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== SIZE SELECTION MODAL ===== */}
            {selectedGarmentForSize && (() => {
                return (
                    <div className="fixed -inset-4 z-[3000] flex items-center justify-center p-8" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15,23,42,0.45)' }}>
                        <div className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border bg-surface text-primary`}>
                            <button onClick={() => setSelectedGarmentForSize(null)} className="absolute top-4 right-4 text-secondary hover:text-rose-500 transition-colors">
                                <FiX size={20} />
                            </button>
                            <div className="text-center mb-6 mt-2">
                                {selectedGarmentForSize.image ? (
                                    <img src={selectedGarmentForSize.image} alt={selectedGarmentForSize.name} className="w-16 h-16 object-cover rounded-2xl mx-auto shadow-md mb-3" />
                                ) : (
                                    <span className="text-5xl mb-3 block drop-shadow-md">{selectedGarmentForSize.icon}</span>
                                )}
                                <h2 className="text-xl font-extrabold tracking-tight">Select Size for {selectedGarmentForSize.name}</h2>
                                <p className="text-xs text-secondary mt-1">Choose a size to add to invoice</p>
                            </div>
                            <div className="space-y-3">
                                {selectedGarmentForSize.sizes.map((size, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            addGarment({
                                                ...selectedGarmentForSize,
                                                name: `${selectedGarmentForSize.name} - ${size.label}`,
                                                price: size.price
                                            }, quickServiceMode);
                                            setSelectedGarmentForSize(null);
                                        }}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] bg-surface-alt border-border hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20`}
                                    >
                                        <span className="font-bold text-lg">{size.label}</span>
                                        <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(size.price)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ===== CARPET SIZE MODAL ===== */}
            {selectedGarmentForCarpet && (() => {
                const ratePerSqm = getGarmentPriceForService(selectedGarmentForCarpet, quickServiceMode);
                const parseDim = (val) => {
                    const n = Number(String(val).replace(',', '.'));
                    return Number.isFinite(n) && n > 0 ? n : 0;
                };
                const height = parseDim(carpetHeightM);
                const width = parseDim(carpetWidthM);
                const areaSqm = height > 0 && width > 0 ? Math.round(height * width * 1000) / 1000 : 0;
                const totalPrice = Math.round(ratePerSqm * areaSqm * 1000) / 1000;

                return (
                    <div className="fixed -inset-4 z-[3000] flex items-center justify-center p-8" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15,23,42,0.45)' }}>
                        <div className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border bg-surface text-primary">
                            <button onClick={() => setSelectedGarmentForCarpet(null)} className="absolute top-4 right-4 text-secondary hover:text-rose-500 transition-colors">
                                <FiX size={20} />
                            </button>

                            <div className="text-center mb-5 mt-2">
                                {selectedGarmentForCarpet.image ? (
                                    <img src={selectedGarmentForCarpet.image} alt={selectedGarmentForCarpet.name} className="w-16 h-16 object-cover rounded-2xl mx-auto shadow-md mb-3" />
                                ) : (
                                    <span className="text-5xl mb-3 block drop-shadow-md">{selectedGarmentForCarpet.icon}</span>
                                )}
                                <h2 className="text-xl font-extrabold tracking-tight">Carpet Size</h2>
                                <p className="text-xs text-secondary mt-1">
                                    Rate: <span className="font-mono font-bold text-primary">{formatCurrency(ratePerSqm)}</span> / sq meter
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                                            Height (m)
                                        </label>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            min="0"
                                            step="0.1"
                                            placeholder="e.g. 2"
                                            value={carpetHeightM}
                                            onChange={(e) => setCarpetHeightM(e.target.value)}
                                            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                                            Width (m)
                                        </label>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            min="0"
                                            step="0.1"
                                            placeholder="e.g. 4"
                                            value={carpetWidthM}
                                            onChange={(e) => setCarpetWidthM(e.target.value)}
                                            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                                        />
                                    </div>
                                </div>

                                {areaSqm > 0 && (
                                    <div className="text-center text-xs font-mono text-secondary">
                                        {height} × {width} = <span className="font-bold text-primary">{areaSqm} sqm</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-alt/40 px-3 py-2 text-sm">
                                    <span className="text-secondary font-semibold">Total</span>
                                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                                        {areaSqm > 0 ? formatCurrency(totalPrice) : '—'}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    disabled={areaSqm <= 0}
                                    onClick={() => {
                                        const note = `Size: ${height} × ${width} m (${areaSqm} sqm)`;
                                        addGarment(
                                            {
                                                ...selectedGarmentForCarpet,
                                                name: `${selectedGarmentForCarpet.name} - ${height}×${width}m`,
                                                price: totalPrice,
                                            },
                                            quickServiceMode,
                                            note
                                        );
                                        setSelectedGarmentForCarpet(null);
                                    }}
                                    className={`w-full mt-2 py-3 rounded-2xl font-black text-white text-sm tracking-wide transition-all active:scale-95 ${areaSqm > 0 ? 'hover:scale-[1.02]' : 'opacity-50 cursor-not-allowed'
                                        }`}
                                    style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}
                                >
                                    ✅ Confirm & Add
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ===== MODIFIER SELECTION MODAL ===== */}
            {selectedGarmentForModifier && (() => {
                const isLight = theme === 'light';
                return (
                    <div className="fixed -inset-4 z-[3000] flex items-center justify-center p-8 outline-none" style={{ backdropFilter: 'blur(8px)', backgroundColor: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(0,0,0,0.65)' }}>
                        <div className={`relative w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border bg-surface text-primary outline-none`} onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedGarmentForModifier(null)} className="absolute top-4 right-4 text-secondary hover:text-rose-500 transition-colors">
                                <FiX size={20} />
                            </button>
                            <div className="text-center mb-6 mt-2">
                                {selectedGarmentForModifier.image ? (
                                    <img src={selectedGarmentForModifier.image} alt={selectedGarmentForModifier.name} className="w-16 h-16 object-cover rounded-2xl mx-auto shadow-md mb-3" />
                                ) : (
                                    <span className="text-5xl mb-3 block drop-shadow-md">{selectedGarmentForModifier.icon}</span>
                                )}
                                <h2 className="text-xl font-extrabold tracking-tight">Select Options for {selectedGarmentForModifier.name}</h2>
                            </div>
                            
                            <div className="space-y-6">
                                {/* Neel Toggle */}
                                <div className="flex items-center gap-3 p-3 bg-surface-alt rounded-xl border border-border cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => setModifierForm(p => ({...p, neel: !p.neel}))}>
                                    <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${modifierForm.neel ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {modifierForm.neel && <FiCheck size={16} />}
                                    </div>
                                    <span className="font-bold text-lg text-primary">Neel (نيل)</span>
                                </div>

                                {/* Required Color Choice */}
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Color Choice</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            {
                                                label: 'Red',
                                                value: 'Red',
                                                active: 'border-rose-300 bg-rose-50/60 dark:border-rose-600/40 dark:bg-rose-900/20',
                                                idle: 'border-border bg-surface-alt hover:border-rose-300 hover:bg-rose-50/40 dark:hover:border-rose-600/30 dark:hover:bg-rose-900/10',
                                            },
                                            {
                                                label: 'White',
                                                value: 'White',
                                                active: 'border-slate-300 bg-white/60 dark:border-slate-500/40 dark:bg-slate-800/50',
                                                idle: 'border-border bg-surface-alt hover:border-slate-300 hover:bg-white/40 dark:hover:border-slate-600/40 dark:hover:bg-slate-800/30',
                                            },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() =>
                                                    setModifierForm((p) => ({
                                                        ...p,
                                                        colorChoice: p.colorChoice === opt.value ? '' : opt.value,
                                                    }))
                                                }
                                                aria-pressed={modifierForm.colorChoice === opt.value}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 ${
                                                    modifierForm.colorChoice === opt.value ? opt.active : opt.idle
                                                }`}
                                            >
                                                <div
                                                    className={`w-6 h-6 rounded flex items-center justify-center border-2 ${
                                                        modifierForm.colorChoice === opt.value
                                                            ? 'bg-blue-600 border-blue-600 text-white'
                                                            : 'border-slate-300 dark:border-slate-600'
                                                    }`}
                                                >
                                                    {modifierForm.colorChoice === opt.value && <FiCheck size={16} />}
                                                </div>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="text-sm font-extrabold"
                                                        style={{ color: isLight ? '#000000' : '#ffffff' }}
                                                    >
                                                        {opt.label}
                                                    </span>
                                                    <span
                                                        className="w-3 h-3 rounded-full border border-black/10 dark:border-white/10 shrink-0"
                                                        style={{ backgroundColor: opt.value === 'Red' ? '#e11d48' : '#ffffff' }}
                                                    />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Fold Options */}
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Fold Style (نوع الطي)</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {['Sharshal', 'Normal', 'Strate', 'Square'].map(opt => (
                                            <button 
                                                key={opt}
                                                type="button"
                                                onClick={() => setModifierForm(p => ({...p, fold: opt}))}
                                                className={`py-2 px-3 rounded-xl border-2 text-sm font-bold transition-all outline-none ${modifierForm.fold === opt ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-surface-alt border-border text-secondary hover:border-slate-400 hover:text-primary'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Starch Options */}
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Starch Level (مستوى النشا)</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {['High', 'Med', 'Little', 'Without'].map(opt => (
                                            <button 
                                                key={opt}
                                                type="button"
                                                onClick={() => setModifierForm(p => ({...p, starch: opt}))}
                                                className={`py-2 px-3 rounded-xl border-2 text-sm font-bold transition-all outline-none ${modifierForm.starch === opt ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-surface-alt border-border text-secondary hover:border-slate-400 hover:text-primary'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    const parts = [];
                                    if (modifierForm.neel) parts.push("Neel");
                                    if (modifierForm.colorChoice) parts.push(`Color: ${modifierForm.colorChoice}`);
                                    if (modifierForm.fold && modifierForm.fold !== 'Normal') parts.push(`Fold: ${modifierForm.fold}`);
                                    if (modifierForm.starch && modifierForm.starch !== 'Without') parts.push(`Starch: ${modifierForm.starch}`);
                                    const note = parts.join(' | ');
                                    
                                    addGarment(selectedGarmentForModifier, quickServiceMode, note);
                                    setSelectedGarmentForModifier(null);
                                }}
                                className="w-full mt-6 py-4 rounded-2xl font-black text-white text-lg tracking-wide transition-all hover:scale-[1.02] active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}
                            >
                                ✅ Confirm & Add
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* ===== MISMATCH ERROR MODAL ===== */}
            {mismatchError && createPortal(
                (() => {
                const isLight = theme === 'light';
                return (
                    <div
                        className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
                        style={{
                            backdropFilter: 'blur(8px)',
                            backgroundColor: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(0,0,0,0.65)'
                        }}
                        onClick={() => setMismatchError(null)}
                    >
                        <div
                            className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 text-center"
                            style={{
                                background: isLight
                                    ? 'linear-gradient(145deg, #fdfaf6 0%, #fffbf0 100%)'
                                    : 'linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
                                border: isLight ? '1px solid #e8d5b0' : '1px solid rgba(255,255,255,0.1)',
                                boxShadow: isLight
                                    ? '0 30px 80px -10px rgba(120,80,20,0.18), 0 0 0 1px rgba(232,213,176,0.6)'
                                    : '0 30px 80px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 mx-auto bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mb-4 border-2 border-rose-200 dark:border-rose-500/30">
                                <span className="text-3xl animate-bounce" style={{ animationDuration: '1.5s' }}>⚠️</span>
                            </div>
                            <h2 className={`text-xl font-extrabold tracking-tight mb-2 ${isLight ? 'text-stone-800' : 'text-white'}`}>
                                {language === 'ar' ? 'خطأ في نوع الخدمة' : 'Service Mismatch'}
                            </h2>
                            <p className={`text-sm mb-6 font-semibold ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
                                {mismatchError}
                            </p>
                            <button
                                type="button"
                                onClick={() => setMismatchError(null)}
                                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-200 bg-rose-600 hover:bg-rose-700 shadow-[0_4px_14px_rgba(225,29,72,0.3)] active:scale-[0.98]"
                            >
                                {language === 'ar' ? 'موافق' : 'OK'}
                            </button>
                        </div>
                    </div>
                );
                })(),
                document.body
            )}

        </div>
    );
};

export default MakeInvoice;
