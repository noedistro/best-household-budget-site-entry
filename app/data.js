// Ledger & Larder — the dataset for the fictional Wren household.
// Every figure below is invented for November 2026 and reconciles by
// construction: the 22 spending rows sum to $4,612, the 2 income rows sum
// to $5,840, so $5,840 - $4,612 = $1,228 is left (a 21% savings rate).
// Category spent totals are the sums of the rows in each category, and
// the six bills are a subset of the spending rows, not extra spending:
// the bills total $1,874 a month, inside the $4,612 already spent.
// In-site "today" is 28 November 2026, so the two unpaid bills are
// overdue, never "due in N days".

export const HOUSEHOLD = {
  name: 'The Wren household',
  members: 'Maya Wren (school librarian) and Daniel Wren (bus mechanic), with June, 9, and Theo, 6',
  town: 'Alderwick',
  monthLabel: 'November 2026',
  todayLabel: '28 Nov 2026',
  todayDay: 28,
};

export const MONTH = { year: 2026, month: 11 };

export const CATEGORIES = [
  { slug: 'groceries', name: 'Groceries', limit: 520, note: 'The big shop on 14 Nov included the freezer stock-up.' },
  { slug: 'housing', name: 'Housing', limit: 1450, note: 'Rent is fixed, so this limit is the rent itself.' },
  { slug: 'transport', name: 'Transport', limit: 560, note: 'Fuel, the bus pass and one late-night taxi home.' },
  { slug: 'utilities', name: 'Utilities', limit: 480, note: 'Four bills plus the gas top-up are inside this.' },
  { slug: 'dining', name: 'Dining out', limit: 180, note: 'Takeaway crept up to four nights in one month.' },
  { slug: 'kids', name: 'Kids & school', limit: 560, note: 'School fund plus new shoes for Theo.' },
  { slug: 'health', name: 'Health', limit: 380, note: 'Pharmacy and one dental check-up.' },
  { slug: 'fun', name: 'Fun & treats', limit: 600, note: 'Theatre tickets and the toy-shop visit.' },
];

// Spending rows, in date order. Category totals:
// Groceries $606, Housing $1,450, Transport $486, Utilities $350,
// Dining out $394, Kids & school $518, Health $296, Fun & treats $512.
// Weekly spending (1-7, 8-14, 15-21, 22-28 Nov):
// $2,029.00, $1,079.65, $714.45, $788.90 — they sum to $4,612.
export const TRANSACTIONS = [
  { date: '2026-11-01', payee: 'Alderwick Lettings', category: 'housing', type: 'spending', amount: 1450.00 },
  { date: '2026-11-03', payee: 'The Copper Kettle', category: 'dining', type: 'spending', amount: 118.40 },
  { date: '2026-11-05', payee: 'Alderwick School Fund', category: 'kids', type: 'spending', amount: 312.00 },
  { date: '2026-11-06', payee: 'Maya Wren — library pay', category: 'income', type: 'income', amount: 3140.00 },
  { date: '2026-11-07', payee: "Marlow's Market", category: 'groceries', type: 'spending', amount: 148.60 },
  { date: '2026-11-08', payee: 'Alderwick Pharmacy', category: 'health', type: 'spending', amount: 88.50 },
  { date: '2026-11-09', payee: 'Alderwick Energy', category: 'utilities', type: 'spending', amount: 132.00 },
  { date: '2026-11-10', payee: 'Alderwick Garage', category: 'transport', type: 'spending', amount: 268.00 },
  { date: '2026-11-11', payee: 'Alderwick Pizza House', category: 'dining', type: 'spending', amount: 96.75 },
  { date: '2026-11-12', payee: 'Alderwick Broadband', category: 'utilities', type: 'spending', amount: 68.00 },
  { date: '2026-11-13', payee: 'Alderwick Theatre', category: 'fun', type: 'spending', amount: 214.00 },
  { date: '2026-11-14', payee: "Marlow's Market", category: 'groceries', type: 'spending', amount: 212.40 },
  { date: '2026-11-15', payee: 'Alderwick Outfitters', category: 'kids', type: 'spending', amount: 206.00 },
  { date: '2026-11-17', payee: 'Alderwick Cabs', category: 'transport', type: 'spending', amount: 144.00 },
  { date: '2026-11-18', payee: 'Alderwick Water', category: 'utilities', type: 'spending', amount: 54.00 },
  { date: '2026-11-19', payee: 'Noodle Bar Alderwick', category: 'dining', type: 'spending', amount: 84.60 },
  { date: '2026-11-20', payee: 'Daniel Wren — garage pay', category: 'income', type: 'income', amount: 2700.00 },
  { date: '2026-11-21', payee: 'Greenleaf Grocers', category: 'groceries', type: 'spending', amount: 129.85 },
  { date: '2026-11-21', payee: 'Alderwick Mobile', category: 'utilities', type: 'spending', amount: 96.00 },
  { date: '2026-11-22', payee: 'Alderwick Dental', category: 'health', type: 'spending', amount: 207.50 },
  { date: '2026-11-25', payee: 'Alderwick Bus Co', category: 'transport', type: 'spending', amount: 74.00 },
  { date: '2026-11-26', payee: 'Spice Corner', category: 'dining', type: 'spending', amount: 94.25 },
  { date: '2026-11-27', payee: 'Alderwick Toy Shop', category: 'fun', type: 'spending', amount: 298.00 },
  { date: '2026-11-28', payee: 'Alderwick Butcher', category: 'groceries', type: 'spending', amount: 115.15 },
];

// The six recurring bills. Four are paid for November; two are overdue
// on 28 Nov (Phone, due 21st — 7 days overdue; Bus pass, due 25th —
// 3 days overdue). Still to pay: $96 + $74 = $170.
// Each bill is also a transaction row above, so the $1,874 monthly
// total ($22,488 a year) is part of the $4,612 spent, not on top of it.
export const BILLS = [
  { slug: 'rent', name: 'Rent', amount: 1450.00, dueDay: 1, paid: true, paidDate: '2026-11-01' },
  { slug: 'electricity', name: 'Electricity', amount: 132.00, dueDay: 9, paid: true, paidDate: '2026-11-09' },
  { slug: 'internet', name: 'Internet', amount: 68.00, dueDay: 12, paid: true, paidDate: '2026-11-12' },
  { slug: 'water', name: 'Water', amount: 54.00, dueDay: 18, paid: true, paidDate: '2026-11-18' },
  { slug: 'phone', name: 'Phone ×2', amount: 96.00, dueDay: 21, paid: false, paidDate: null },
  { slug: 'bus', name: 'Bus pass', amount: 74.00, dueDay: 25, paid: false, paidDate: null },
];

// Savings goals. Progress rounds to whole percent: 73%, 62%, 63%.
// Months-to-go rounds up: 6, 5, 3. Monthly saving across the three
// goals is $310 + $140 + $90 = $540, inside the $1,228 left over.
export const GOALS = [
  { slug: 'emergency', name: 'Emergency fund', target: 6000, saved: 4350, monthly: 310, note: 'First, always: three months of rent and bills, so one bad month never becomes a crisis.' },
  { slug: 'washer', name: 'New washing machine', target: 650, saved: 410, monthly: 90, note: 'Second: the old washer leaks, and a new one costs less than three call-outs.' },
  { slug: 'holiday', name: 'Family holiday to the coast', target: 1800, saved: 1120, monthly: 140, note: 'Third: the fun one, saved for after the practical things are covered.' },
];
