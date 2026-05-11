// Türk Lirası formatı: 1.250,00 ₺
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₺0,00';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Sadece sayı formatı binlik ayraçlı: 1.250,00
export const formatNumber = (amount, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0,00';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

// Tarih: "08.05.2026"
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ISO tarih input için: "2026-05-08"
export const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('.');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr;
};

// Bugünün tarihini ISO formatında döndür
export const today = () => new Date().toISOString().split('T')[0];

// KDV oranları
export const KDV_RATES = [
  { label: '%1 KDV', value: 0.01 },
  { label: '%10 KDV', value: 0.10 },
  { label: '%20 KDV', value: 0.20 },
  { label: 'KDV Yok', value: 0 },
];

// Tevkifat oranları (inşaat/hizmet)
export const TEVKIFAT_RATES = [
  { label: 'Yok', value: 0 },
  { label: '2/10 Tevkifat', value: 0.2 },
  { label: '3/10 Tevkifat', value: 0.3 },
  { label: '5/10 Tevkifat', value: 0.5 },
  { label: '7/10 Tevkifat', value: 0.7 },
  { label: '9/10 Tevkifat', value: 0.9 },
];

// Fatura satır toplamı hesapla
export const calcLineTotal = (qty, unitPrice) => {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(unitPrice) || 0;
  return q * p;
};

// Fatura toplamları hesapla
export const calcInvoiceTotals = (items) => {
  const subtotal = items.reduce((sum, item) => sum + calcLineTotal(item.qty, item.unitPrice), 0);
  const vatAmount = items.reduce((sum, item) => {
    const lineTotal = calcLineTotal(item.qty, item.unitPrice);
    return sum + lineTotal * (parseFloat(item.vatRate) || 0);
  }, 0);
  const tevkifatAmount = items.reduce((sum, item) => {
    const lineTotal = calcLineTotal(item.qty, item.unitPrice);
    const vat = lineTotal * (parseFloat(item.vatRate) || 0);
    return sum + vat * (parseFloat(item.tevkifatRate) || 0);
  }, 0);
  const total = subtotal + vatAmount - tevkifatAmount;
  return { subtotal, vatAmount, tevkifatAmount, total };
};

// Benzersiz ID üret
export const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Fatura numarası üret
export const genInvoiceNo = (prefix = 'INV', existing = []) => {
  const year = new Date().getFullYear();
  const nums = existing
    .map(n => parseInt((n || '').split('-').pop()))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${year}-${String(next).padStart(3, '0')}`;
};

// Vergi no doğrulama (10 veya 11 hane)
export const isValidTaxNo = (val) => /^\d{10,11}$/.test((val || '').trim());

// Telefon doğrulama
export const isValidPhone = (val) => /^(\+90|0)?[0-9]{10}$/.test((val || '').replace(/\s/g, ''));

// E-posta doğrulama
export const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val || '');

// Stok uyarı rengi
export const stockStatusColor = (qty, minQty) => {
  if (qty <= 0) return 'var(--danger)';
  if (qty <= minQty) return 'var(--warning)';
  return 'var(--success)';
};

// Para birimi sembolü
export const TRY = '₺';
