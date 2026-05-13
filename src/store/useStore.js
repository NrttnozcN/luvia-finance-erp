import { create } from 'zustand';
import { genId, genInvoiceNo, today } from '../utils/formatters';

// ─── Başlangıç verileri ───────────────────────────────────────────────────────

const initialCustomers = [
  { id: 'c1', name: 'Tekno Corp Lojistik', type: 'Müşteri', phone: '+90 532 000 0001', email: 'info@teknokorp.com', city: 'İstanbul', taxOffice: 'Kadıköy V.D.', taxNo: '1234567890', address: 'Kadıköy, İstanbul', creditLimit: 200000, status: 'active' },
  { id: 'c2', name: 'Petrol Ofisi A.Ş.', type: 'Tedarikçi', phone: '+90 212 000 0002', email: 'fatura@po.com', city: 'Ankara', taxOffice: 'Çankaya V.D.', taxNo: '9876543210', address: 'Çankaya, Ankara', creditLimit: 100000, status: 'active' },
  { id: 'c3', name: 'Global Yedek Parça', type: 'Tedarikçi', phone: '+90 232 000 0003', email: 'satis@globalyp.com', city: 'İzmir', taxOffice: 'Konak V.D.', taxNo: '1122334455', address: 'Konak, İzmir', creditLimit: 50000, status: 'active' },
  { id: 'c4', name: 'Hızlı Kurye Ltd.', type: 'Müşteri', phone: '+90 555 000 0004', email: 'muhasebe@hizlikurye.com', city: 'Bursa', taxOffice: 'Osmangazi V.D.', taxNo: '5566778899', address: 'Osmangazi, Bursa', creditLimit: 300000, status: 'active' },
];

const initialVehicles = [
  { id: 'v1', plate: '34 LUV 001', brand: 'Mercedes', model: 'Actros', year: '2022', vin: 'WDB96341311234567', driverId: 'p1', type: 'Çekici', status: 'Seferde', nextMaintenance: '2026-06-15', nextInspection: '2026-09-01', insuranceExpiry: '2026-12-31', health: 85 },
  { id: 'v2', plate: '06 ERP 99', brand: 'Ford', model: 'Cargo', year: '2020', vin: 'NM0GE9BV3LT123456', driverId: 'p2', type: 'Kamyon', status: 'Garajda', nextMaintenance: '2026-05-20', nextInspection: '2026-05-30', insuranceExpiry: '2026-07-15', health: 42 },
  { id: 'v3', plate: '35 LOG 123', brand: 'Scania', model: 'R450', year: '2023', vin: 'YS2R4X20005123456', driverId: 'p3', type: 'Çekici', status: 'Seferde', nextMaintenance: '2026-08-10', nextInspection: '2027-01-15', insuranceExpiry: '2026-12-31', health: 92 },
];

const initialPersonnel = [
  { id: 'p1', name: 'Ahmet Yılmaz', position: 'Şoför', department: 'Operasyon', facility: 'İstanbul Merkez', salary: 35000, status: 'active', phone: '+90 532 111 1111', startDate: '2020-03-01', advances: [] },
  { id: 'p2', name: 'Mehmet Demir', position: 'Şoför', department: 'Operasyon', facility: 'Ankara Şube', salary: 33000, status: 'active', phone: '+90 532 222 2222', startDate: '2019-07-15', advances: [] },
  { id: 'p3', name: 'Caner Öz', position: 'Şoför', department: 'Operasyon', facility: 'İzmir Depo', salary: 34000, status: 'active', phone: '+90 532 333 3333', startDate: '2021-01-10', advances: [] },
  { id: 'p4', name: 'Fatma Kaya', position: 'Muhasebe', department: 'Finans', facility: 'İstanbul Merkez', salary: 45000, status: 'active', phone: '+90 532 444 4444', startDate: '2018-05-20', advances: [] },
];

const initialStockItems = [
  { id: 's1', name: 'Motor Yağı Castrol 5W30', category: 'Bakım Malzemeleri', unit: 'Litre', qty: 45, minQty: 20, unitCost: 280, facility: 'İstanbul Merkez' },
  { id: 's2', name: 'Filtre Seti - Mercedes', category: 'Yedek Parça', unit: 'Adet', qty: 12, minQty: 10, unitCost: 850, facility: 'İstanbul Merkez' },
  { id: 's3', name: 'Lastik 315/80 R22.5', category: 'Lastik', unit: 'Adet', qty: 8, minQty: 15, unitCost: 4200, facility: 'İstanbul Merkez' },
  { id: 's4', name: 'Antifriz 5Lt', category: 'Bakım Malzemeleri', unit: 'Adet', qty: 0, minQty: 10, unitCost: 180, facility: 'İzmir Depo' },
];

const initialInvoices = [
  {
    id: 'inv1', no: 'INV-2026-001', type: 'Alış Faturası', customerId: 'c2',
    date: '2026-05-08', dueDate: '2026-06-08', destination: 'vehicle', vehicleId: 'v1',
    items: [{ id: 'item1', expenseCard: 'Akaryakıt Giderleri', name: 'Motorin', qty: 500, unit: 'Litre', unitPrice: 45, vatRate: 0.20, tevkifatRate: 0 }],
    subtotal: 22500, vatAmount: 4500, tevkifatAmount: 0, total: 27000,
    status: 'unpaid', payments: []
  },
  {
    id: 'inv2', no: 'INV-2026-002', type: 'Satış Faturası', customerId: 'c1',
    date: '2026-05-06', dueDate: '2026-06-06', destination: 'none', vehicleId: null,
    items: [{ id: 'item2', expenseCard: 'Nakliye Gelirleri', name: 'Nakliye Hizmeti', qty: 1, unit: 'Sefer', unitPrice: 85000, vatRate: 0.20, tevkifatRate: 0 }],
    subtotal: 85000, vatAmount: 17000, tevkifatAmount: 0, total: 102000,
    status: 'partial', payments: [{ id: 'pay1', amount: 50000, date: '2026-05-08', method: 'Banka', accountId: 'acc1' }]
  },
];

const initialTransactions = [
  { id: 't1', type: 'in', title: 'Tahsilat', desc: 'Tekno Corp - Kısmi Ödeme INV-2026-002', date: '2026-05-08', amount: 50000, accountId: 'acc1', customerId: 'c1', invoiceId: 'inv2', entries: [] },
  { id: 't2', type: 'out', title: 'Ödeme', desc: 'Petrol Ofisi - Akaryakıt Faturası', date: '2026-05-07', amount: 4200, accountId: 'acc1', customerId: 'c2', invoiceId: null, entries: [] },
];

const initialAccounts = [
  { id: 'acc1', name: 'Merkez TL Kasa', type: 'kasa', balance: 125000, currency: 'TRY' },
  { id: 'acc2', name: 'Ziraat Bankası - TL', type: 'banka', balance: 348000, currency: 'TRY' },
  { id: 'acc3', name: 'Akbank Kredi Kartı', type: 'kart', balance: -18500, currency: 'TRY' },
];

const initialFuelEntries = [
  { id: 'f1', vehicleId: 'v1', date: '2026-05-08', liters: 500, pricePerLiter: 45, total: 22500, station: 'Petrol Ofisi', customerId: 'c2' },
  { id: 'f2', vehicleId: 'v3', date: '2026-05-07', liters: 420, pricePerLiter: 45, total: 18900, station: 'BP', customerId: null },
];

const initialTireEntries = [
  { id: 'tr1', vehicleId: 'v2', date: '2026-05-05', brand: 'Michelin', size: '315/80 R22.5', qty: 4, unitPrice: 4200, total: 16800, type: 'Yeni Montaj' },
];

const initialChecks = [
  { id: 'ck1', type: 'Müşteri Çeki', customerId: 'c1', dueDate: '2026-06-15', amount: 12500, bank: 'Garanti BBVA', branch: 'Gebze', status: 'portfoy', note: '', date: '2026-05-01' },
  { id: 'ck2', type: 'Kendi Çekimiz', customerId: 'c2', dueDate: '2026-05-01', amount: 45000, bank: 'Ziraat Bankası', branch: 'Merkez', status: 'vadesi_gecen', note: '', date: '2026-04-15' },
  { id: 'ck3', type: 'Müşteri Çeki', customerId: 'c4', dueDate: '2026-07-20', amount: 28000, bank: 'Yapı Kredi', branch: 'Bursa', status: 'portfoy', note: '', date: '2026-05-05' },
];

const initialRevenueExpenses = [
  { id: 're1', type: 'Gider', category: 'Kira/Ofis', amount: 45000, date: '2026-05-05', desc: 'Ofis Kirası - Mayıs 2026', accountId: 'acc2' },
  { id: 're2', type: 'Gider', category: 'Yemek', amount: 1250, date: '2026-05-08', desc: 'Personel Yemek Giderleri', accountId: 'acc1' },
  { id: 're3', type: 'Gelir', category: 'Faiz', amount: 3200, date: '2026-05-10', desc: 'Banka Faiz Geliri', accountId: 'acc2' },
];

const initialFacilities = [
  { id: 'fac1', name: 'İstanbul Merkez', type: 'Genel Merkez / Depo', address: 'Gebze OSB, Kocaeli', city: 'İstanbul', status: 'Aktif', phone: '+90 262 000 0001' },
  { id: 'fac2', name: 'İzmir Depo', type: 'Lojistik Merkezi', address: 'Bornova, İzmir', city: 'İzmir', status: 'Aktif', phone: '+90 232 000 0002' },
  { id: 'fac3', name: 'Ankara Şube', type: 'Satış Ofisi', address: 'Çankaya, Ankara', city: 'Ankara', status: 'Aktif', phone: '+90 312 000 0003' },
];

const initialPurchaseRequests = [
  { id: 'pr1', no: 'PRQ-001', userId: 'p1', item: '10 Adet Lastik 315/80', qty: 10, unit: 'Adet', priority: 'Acil', type: 'Malzeme Alımı', reason: 'Araç bakımı için', date: '2026-05-08', status: 'pending', approvedBy: null, invoiceId: null },
  { id: 'pr2', no: 'PRQ-002', userId: 'p2', item: 'Yedek Parça Seti Mercedes', qty: 1, unit: 'Set', priority: 'Normal', type: 'Malzeme Alımı', reason: 'Periyodik bakım', date: '2026-05-07', status: 'approved', approvedBy: 'p4', invoiceId: null },
];

// ─── Muhasebe Muhasebe (Chart of Accounts / Hesap Planı) ─────────────────────
const ACCOUNTS_CHART = {
  '100': 'Kasa',
  '102': 'Bankalar',
  '120': 'Alıcılar (Müşteriler)',
  '320': 'Satıcılar (Tedarikçiler)',
  '153': 'Ticari Mallar / Stok',
  '191': 'İndirilecek KDV',
  '391': 'Hesaplanan KDV',
  '600': 'Yurt İçi Satışlar',
  '620': 'Satılan Ticari Mallar Maliyeti',
  '730': 'Genel Üretim Giderleri',
  '740': 'Hizmet Üretim Maliyeti',
  '770': 'Genel Yönetim Giderleri',
  '780': 'Finansman Giderleri',
  '760': 'Pazarlama Giderleri',
  '632': 'Genel Yönetim Giderleri (632)',
  '740_yakıt': 'Akaryakıt Giderleri',
  '740_bakım': 'Bakım/Onarım Giderleri',
  '740_lastik': 'Lastik Giderleri',
  '720': 'Direkt İşçilik Giderleri',
};

// ─── Çift Taraflı Muhasebe Kaydı Üretici ─────────────────────────────────────

export const buildInvoiceEntries = (invoice) => {
  const { subtotal, vatAmount, total, type } = invoice;
  const isSales = type === 'Satış Faturası';
  const entries = [];

  if (isSales) {
    // Satış faturası: Alıcılar borçlanır, Satışlar ve Hesaplanan KDV alacaklanır
    entries.push({ account: '120', accountName: 'Alıcılar', side: 'borc', amount: total });
    entries.push({ account: '600', accountName: 'Yurt İçi Satışlar', side: 'alacak', amount: subtotal });
    if (vatAmount > 0)
      entries.push({ account: '391', accountName: 'Hesaplanan KDV', side: 'alacak', amount: vatAmount });
  } else {
    // Alış / Hizmet alımı: Gider/Stok borçlanır, İndirilecek KDV borçlanır, Satıcılar alacaklanır
    const expenseAccount = invoice.destination === 'warehouse' ? '153' : '740_yakıt';
    entries.push({ account: expenseAccount, accountName: ACCOUNTS_CHART[expenseAccount] || 'Gider', side: 'borc', amount: subtotal });
    if (vatAmount > 0)
      entries.push({ account: '191', accountName: 'İndirilecek KDV', side: 'borc', amount: vatAmount });
    entries.push({ account: '320', accountName: 'Satıcılar', side: 'alacak', amount: total });
  }
  return entries;
};

export const buildPaymentEntries = (payment, invoiceType) => {
  const isSales = invoiceType === 'Satış Faturası';
  const entries = [];
  if (isSales) {
    entries.push({ account: '102', accountName: 'Bankalar / Kasa', side: 'borc', amount: payment.amount });
    entries.push({ account: '120', accountName: 'Alıcılar', side: 'alacak', amount: payment.amount });
  } else {
    entries.push({ account: '320', accountName: 'Satıcılar', side: 'borc', amount: payment.amount });
    entries.push({ account: '102', accountName: 'Bankalar / Kasa', side: 'alacak', amount: payment.amount });
  }
  return entries;
};

// ─── Store ────────────────────────────────────────────────────────────────────

const useStore = create((set, get) => ({
  // ── Veriler ──────────────────────────────────────────────────────────────
  customers: initialCustomers,
  vehicles: initialVehicles,
  personnel: initialPersonnel,
  stockItems: initialStockItems,
  invoices: initialInvoices,
  transactions: initialTransactions,
  accounts: initialAccounts,
  fuelEntries: initialFuelEntries,
  tireEntries: initialTireEntries,
  purchaseRequests: initialPurchaseRequests,
  checks: initialChecks,
  revenueExpenses: initialRevenueExpenses,
  facilities: initialFacilities,
  ledgerEntries: [],        // muhasebe fişleri buraya birikir
  openInvoiceModal: false,  // App.jsx anti-pattern yerine

  // ── UI ───────────────────────────────────────────────────────────────────
  setOpenInvoiceModal: (val) => set({ openInvoiceModal: val }),

  // ── Cari işlemleri ───────────────────────────────────────────────────────
  addCustomer: (data) => set(s => ({
    customers: [...s.customers, { ...data, id: genId(), advances: [] }]
  })),

  // Cari bakiyesini fatura ve ödemelerden gerçek zamanlı hesapla
  getCustomerBalance: (customerId) => {
    const { invoices } = get();
    return invoices.reduce((balance, inv) => {
      if (inv.customerId !== customerId) return balance;
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const outstanding = inv.total - paid;
      if (inv.type === 'Satış Faturası') return balance + outstanding; // alacak
      return balance - outstanding; // borç (alış/hizmet)
    }, 0);
  },

  // ── Fatura işlemleri ─────────────────────────────────────────────────────
  addInvoice: (invoiceData) => {
    const { invoices } = get();
    const nos = invoices.map(i => i.no);
    const prefix = invoiceData.type === 'Satış Faturası' ? 'SAT' : 'ALI';
    const no = genInvoiceNo(prefix, nos);
    const customer = get().customers.find(c => c.id === invoiceData.customerId);
    const entries = buildInvoiceEntries(invoiceData);
    const newInvoice = { ...invoiceData, id: genId(), no, status: 'unpaid', payments: [], entries };

    // Stok girişi: fatura → depo ise stok güncelle
    if (invoiceData.destination === 'warehouse') {
      invoiceData.items.forEach(item => {
        get().addStockMovement({
          itemName: item.name,
          qty: item.qty,
          type: 'giriş',
          ref: no,
          note: `Fatura: ${no}`,
        });
      });
    }

    // Araç maliyet kaydı
    if (invoiceData.destination === 'vehicle' && invoiceData.vehicleId) {
      // Toplam maliyet vehicleId bazlı faturadan hesaplanır — ek kayıt gerekmez
    }

    // Muhasebe fişi oluştur
    const ledgerEntry = {
      id: genId(),
      date: invoiceData.date,
      ref: no,
      type: 'Fatura',
      desc: `${invoiceData.type} - ${customer?.name || ''}`,
      entries,
    };

    set(s => ({
      invoices: [...s.invoices, newInvoice],
      ledgerEntries: [...s.ledgerEntries, ledgerEntry],
    }));

    return newInvoice;
  },

  // Fatura ödemesi kaydet
  addInvoicePayment: (invoiceId, paymentData) => {
    set(s => {
      const inv = s.invoices.find(i => i.id === invoiceId);
      if (!inv) return s;

      const newPayment = { ...paymentData, id: genId() };
      const payments = [...inv.payments, newPayment];
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const status = totalPaid >= inv.total ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

      const updatedInvoices = s.invoices.map(i => i.id === invoiceId ? { ...i, payments, status } : i);

      // Kasa/banka güncelle
      const accounts = s.accounts.map(acc => {
        if (acc.id !== paymentData.accountId) return acc;
        const delta = inv.type === 'Satış Faturası' ? paymentData.amount : -paymentData.amount;
        return { ...acc, balance: acc.balance + delta };
      });

      // Muhasebe fişi
      const payEntries = buildPaymentEntries(newPayment, inv.type);
      const ledgerEntry = {
        id: genId(),
        date: paymentData.date,
        ref: `ODE-${inv.no}`,
        type: 'Ödeme',
        desc: `Ödeme: ${inv.no}`,
        entries: payEntries,
      };

      return {
        ...s,
        invoices: updatedInvoices,
        accounts,
        ledgerEntries: [...s.ledgerEntries, ledgerEntry],
      };
    });
  },

  // ── Stok işlemleri ───────────────────────────────────────────────────────
  addStockItem: (data) => set(s => ({
    stockItems: [...s.stockItems, { ...data, id: genId(), qty: parseFloat(data.qty) || 0 }]
  })),

  addStockMovement: ({ itemName, qty, type }) => {
    set(s => ({
      stockItems: s.stockItems.map(item => {
        if (item.name !== itemName) return item;
        const delta = type === 'giriş' ? parseFloat(qty) : -parseFloat(qty);
        return { ...item, qty: Math.max(0, item.qty + delta) };
      }),
    }));
  },

  updateStockItem: (id, data) => set(s => ({
    stockItems: s.stockItems.map(i => i.id === id ? { ...i, ...data } : i)
  })),

  // ── Araç işlemleri ───────────────────────────────────────────────────────
  addVehicle: (data) => set(s => ({
    vehicles: [...s.vehicles, { ...data, id: genId(), health: 100 }]
  })),

  updateVehicle: (id, data) => set(s => ({
    vehicles: s.vehicles.map(v => v.id === id ? { ...v, ...data } : v)
  })),

  // Plaka bazlı toplam maliyet hesapla
  getVehicleTotalCost: (vehicleId) => {
    const { invoices, fuelEntries, tireEntries } = get();
    const vehicle = get().vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return 0;

    const fuelCost = fuelEntries
      .filter(f => f.vehicleId === vehicleId)
      .reduce((s, f) => s + f.total, 0);

    const tireCost = tireEntries
      .filter(t => t.vehicleId === vehicleId)
      .reduce((s, t) => s + t.total, 0);

    const invoiceCost = invoices
      .filter(i => i.vehicleId === vehicleId)
      .reduce((s, i) => s + i.total, 0);

    return fuelCost + tireCost + invoiceCost;
  },

  // ── Yakıt işlemleri ──────────────────────────────────────────────────────
  addFuelEntry: (data) => set(s => ({
    fuelEntries: [...s.fuelEntries, { ...data, id: genId() }]
  })),

  // ── Lastik işlemleri ─────────────────────────────────────────────────────
  addTireEntry: (data) => set(s => ({
    tireEntries: [...s.tireEntries, { ...data, id: genId() }]
  })),

  // ── Personel / Avans işlemleri ───────────────────────────────────────────
  addPersonnel: (data) => set(s => ({
    personnel: [...s.personnel, { ...data, id: genId(), advances: [] }]
  })),

  addAdvance: (personnelId, advanceData) => set(s => ({
    personnel: s.personnel.map(p => {
      if (p.id !== personnelId) return p;
      return { ...p, advances: [...(p.advances || []), { ...advanceData, id: genId() }] };
    }),
  })),

  // ── Finans/Hesap işlemleri ───────────────────────────────────────────────
  addTransaction: (data) => {
    const entries = data.type === 'in'
      ? [
          { account: '102', accountName: 'Bankalar/Kasa', side: 'borc', amount: data.amount },
          { account: data.customerId ? '120' : '600', accountName: data.customerId ? 'Alıcılar' : 'Gelir', side: 'alacak', amount: data.amount },
        ]
      : [
          { account: data.customerId ? '320' : '770', accountName: data.customerId ? 'Satıcılar' : 'Gider', side: 'borc', amount: data.amount },
          { account: '102', accountName: 'Bankalar/Kasa', side: 'alacak', amount: data.amount },
        ];

    const ledgerEntry = {
      id: genId(), date: data.date, ref: `TXN-${genId().slice(0, 6)}`,
      type: data.type === 'in' ? 'Tahsilat' : 'Ödeme', desc: data.desc, entries,
    };

    set(s => {
      const accounts = s.accounts.map(acc => {
        if (acc.id !== data.accountId) return acc;
        const delta = data.type === 'in' ? data.amount : -data.amount;
        return { ...acc, balance: acc.balance + delta };
      });
      return {
        transactions: [...s.transactions, { ...data, id: genId(), entries }],
        accounts,
        ledgerEntries: [...s.ledgerEntries, ledgerEntry],
      };
    });
  },

  // ── Satın alma işlemleri ─────────────────────────────────────────────────
  addPurchaseRequest: (data) => set(s => {
    const no = `PRQ-${String(s.purchaseRequests.length + 1).padStart(3, '0')}`;
    return { purchaseRequests: [...s.purchaseRequests, { ...data, id: genId(), no, status: 'pending', approvedBy: null, invoiceId: null }] };
  }),

  approvePurchaseRequest: (id, approvedById) => set(s => ({
    purchaseRequests: s.purchaseRequests.map(pr =>
      pr.id === id ? { ...pr, status: 'approved', approvedBy: approvedById } : pr
    ),
  })),

  rejectPurchaseRequest: (id) => set(s => ({
    purchaseRequests: s.purchaseRequests.map(pr =>
      pr.id === id ? { ...pr, status: 'rejected' } : pr
    ),
  })),

  // ── Türetilmiş hesaplamalar ───────────────────────────────────────────────

  // ── Çek & Senet ─────────────────────────────────────────────────────────
  addCheck: (data) => set(s => ({ checks: [...s.checks, { ...data, id: genId(), status: 'portfoy' }] })),
  updateCheckStatus: (id, status) => set(s => ({ checks: s.checks.map(c => c.id === id ? { ...c, status } : c) })),

  // ── Gelir & Gider ────────────────────────────────────────────────────────
  addRevenueExpense: (data) => set(s => ({ revenueExpenses: [...s.revenueExpenses, { ...data, id: genId() }] })),

  // ── Tesis & Lokasyon ─────────────────────────────────────────────────────
  addFacility: (data) => set(s => ({ facilities: [...s.facilities, { ...data, id: genId(), status: 'Aktif' }] })),
  updateFacility: (id, data) => set(s => ({ facilities: s.facilities.map(f => f.id === id ? { ...f, ...data } : f) })),

  // Dashboard KPI'ları
  getDashboardStats: () => {
    const { invoices, accounts, stockItems, vehicles } = get();
    const today_ = today();

    const totalReceivable = invoices
      .filter(i => i.type === 'Satış Faturası')
      .reduce((s, i) => {
        const paid = i.payments.reduce((p, x) => p + x.amount, 0);
        return s + Math.max(0, i.total - paid);
      }, 0);

    const totalPayable = invoices
      .filter(i => i.type !== 'Satış Faturası')
      .reduce((s, i) => {
        const paid = i.payments.reduce((p, x) => p + x.amount, 0);
        return s + Math.max(0, i.total - paid);
      }, 0);

    const overdueInvoices = invoices.filter(i => {
      if (i.status === 'paid') return false;
      return i.dueDate && i.dueDate < today_;
    });

    const criticalStock = stockItems.filter(s => s.qty <= s.minQty);

    const totalCash = accounts.reduce((s, a) => s + a.balance, 0);

    const thisMonthSales = invoices
      .filter(i => i.type === 'Satış Faturası' && i.date?.startsWith(today_.slice(0, 7)))
      .reduce((s, i) => s + i.total, 0);

    return {
      totalReceivable,
      totalPayable,
      overdueCount: overdueInvoices.length,
      criticalStockCount: criticalStock.length,
      totalCash,
      thisMonthSales,
      activeVehicles: vehicles.filter(v => v.status === 'Seferde').length,
    };
  },

  // Uyarı merkezi için tüm kritik durumlar
  getAlerts: () => {
    const { invoices, vehicles, stockItems } = get();
    const today_ = today();
    const in7Days = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0];
    const in30Days = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
    const alerts = [];

    invoices.forEach(inv => {
      if (inv.status !== 'paid' && inv.dueDate && inv.dueDate < today_) {
        const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
        alerts.push({ id: `inv-${inv.id}`, type: 'danger', category: 'Fatura', title: `Vadesi Geçmiş: ${inv.no}`, detail: `Kalan: ₺${(inv.total - paid).toLocaleString('tr-TR')}` });
      }
    });

    vehicles.forEach(v => {
      if (v.nextInspection && v.nextInspection <= in7Days) {
        alerts.push({ id: `ins-${v.id}`, type: v.nextInspection < today_ ? 'danger' : 'warning', category: 'Araç', title: `Muayene: ${v.plate}`, detail: `Tarih: ${v.nextInspection}` });
      }
      if (v.nextMaintenance && v.nextMaintenance <= in7Days) {
        alerts.push({ id: `mnt-${v.id}`, type: 'warning', category: 'Araç', title: `Bakım Yaklaşıyor: ${v.plate}`, detail: `Tarih: ${v.nextMaintenance}` });
      }
      if (v.insuranceExpiry && v.insuranceExpiry <= in30Days) {
        alerts.push({ id: `sig-${v.id}`, type: 'warning', category: 'Sigorta', title: `Sigorta Bitiyor: ${v.plate}`, detail: `Bitiş: ${v.insuranceExpiry}` });
      }
    });

    stockItems.forEach(s => {
      if (s.qty <= 0) {
        alerts.push({ id: `stk-${s.id}`, type: 'danger', category: 'Stok', title: `Stok Bitti: ${s.name}`, detail: `Mevcut: 0 ${s.unit}` });
      } else if (s.qty <= s.minQty) {
        alerts.push({ id: `stk-low-${s.id}`, type: 'warning', category: 'Stok', title: `Kritik Stok: ${s.name}`, detail: `${s.qty} ${s.unit} (Min: ${s.minQty})` });
      }
    });

    return alerts.sort((a, b) => {
      if (a.type === 'danger' && b.type !== 'danger') return -1;
      if (a.type !== 'danger' && b.type === 'danger') return 1;
      return 0;
    });
  },

  // Genel arama
  globalSearch: (query) => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const { customers, invoices, vehicles, stockItems, personnel } = get();
    const results = [];

    customers.forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.taxNo?.includes(q)) {
        results.push({ type: 'cari', tab: 'cariler', label: c.name, sub: c.type, id: c.id });
      }
    });
    invoices.forEach(i => {
      if (i.no.toLowerCase().includes(q)) {
        results.push({ type: 'fatura', tab: 'invoices', label: i.no, sub: `${i.type} - ${i.total.toLocaleString('tr-TR')} ₺`, id: i.id });
      }
    });
    vehicles.forEach(v => {
      if (v.plate.toLowerCase().includes(q) || v.brand.toLowerCase().includes(q)) {
        results.push({ type: 'araç', tab: 'vehicles', label: v.plate, sub: `${v.brand} ${v.model}`, id: v.id });
      }
    });
    stockItems.forEach(s => {
      if (s.name.toLowerCase().includes(q)) {
        results.push({ type: 'stok', tab: 'stock', label: s.name, sub: `${s.qty} ${s.unit}`, id: s.id });
      }
    });
    personnel.forEach(p => {
      if (p.name.toLowerCase().includes(q)) {
        results.push({ type: 'personel', tab: 'personnel', label: p.name, sub: p.position, id: p.id });
      }
    });

    return results.slice(0, 10);
  },
}));

export default useStore;
