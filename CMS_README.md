# 🎯 Client Management System (CMS)

## Professional, Lightweight, Customer-Centric Business Management

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Getting Started](#getting-started)
5. [Database Schema](#database-schema)
6. [User Guide](#user-guide)
7. [Developer Notes](#developer-notes)

---

## 🌟 Overview

This Client Management System is a professional, lightweight application designed for **customer-centric business management**. Built with a focus on **clarity, ease of use, and exceptional UX/UI**, it transforms complex financial tracking into an intuitive, streamlined experience.

### Design Philosophy

- **Customer-First**: Every feature prioritizes client record management and accessibility
- **Dual-Currency Support**: Native KES (Kenyan Shillings) and USD tracking per client
- **Visual Excellence**: Modern, clean interface with intuitive navigation
- **Professional Reports**: Beautiful PDF reports for each client
- **Simplicity**: Remove complexity, keep only what matters

---

## ✨ Key Features

### 1. **Client Management**

- 🔍 **Smart Search**: Instant search by name, code, email, or phone
- 📊 **Client Dashboard**: At-a-glance financial overview
- 💼 **Business Details**: Store complete client information
- 🏷️ **Status Tracking**: Active, Inactive, Pending, Archived
- 📱 **Responsive Design**: Works perfectly on all devices

### 2. **Dual-Currency System**

Each client has **two separate transaction tables**:

- **KES (Kenyan Shillings)**: Local currency transactions
- **USD (US Dollars)**: International transactions
- Real-time balance calculations
- Independent reporting for each currency

### 3. **Transaction Management**

- **Invoice Tracking**: Record invoices and receivables
- **Payment Recording**: Track payments received
- **Multiple Payment Methods**: Cash, M-Pesa, Bank Transfer, etc.
- **Reference Numbers**: Link to external systems
- **Attachments Support**: Store receipt URLs

### 4. **Vehicle/Truck Tracking** (Optional)

- Track business assets (trucks, vans, cars)
- Associate vehicles with clients
- Monitor purchase price and current value
- Service date tracking
- Status management (Active, Maintenance, Sold, etc.)

### 5. **Professional PDF Reports**

- **Client-Specific Reports**: Generate detailed PDF reports per client
- **Multiple Report Types**:
  - Full Report (KES + USD)
  - Summary Report
  - KES Only
  - USD Only
- **Beautiful Design**: Professional formatting with company branding
- **Transaction Details**: Complete transaction history
- **Financial Summary**: Clear balance calculations

### 6. **Modern Dashboard**

- **Real-Time Stats**: Total clients, revenue, pending payments
- **Quick Actions**: Navigate to key features instantly
- **Recent Clients**: Access recently added clients
- **Visual Cards**: Color-coded, easy-to-scan information

---

## 🏗️ Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **Icons**: Lucide React
- **Build Tool**: Vite

### Component Structure

```
src/
├── components/
│   ├── Auth.tsx                 # Authentication
│   ├── BiometricLock.tsx        # Face ID/Biometric
│   ├── Layout.tsx               # Main layout with navigation
│   ├── CMSDashboard.tsx         # Main dashboard
│   ├── ClientList.tsx           # Client search & list
│   ├── ClientDetail.tsx         # Individual client view
│   ├── Vehicles.tsx             # Vehicle management
│   └── Reports.tsx              # Reporting interface
├── contexts/
│   └── AuthContext.tsx          # Authentication context
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── currency.ts              # Currency formatting
│   └── pdfGenerator.ts          # PDF report generation
└── App.tsx                      # Main application
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd Ezary_v1
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**

   - Create a new Supabase project
   - Run the migration file: `supabase/migrations/001_create_cms_schema.sql`
   - Update `.env` with your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

---

## 🗄️ Database Schema

### Core Tables

#### 1. **clients** (Master Table)

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- client_name: TEXT (Required)
- client_code: TEXT (Unique, e.g., CLT-0001)
- email: TEXT
- phone: TEXT
- business_name: TEXT
- address: TEXT
- tax_id: TEXT
- status: TEXT (active, inactive, pending, archived)
- tags: TEXT[]
- notes: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- last_transaction_date: DATE
```

#### 2. **client_transactions_kes** (KES Transactions)

```sql
- id: UUID (Primary Key)
- client_id: UUID (Foreign Key to clients)
- user_id: UUID (Foreign Key to auth.users)
- amount: DECIMAL(15,2)
- transaction_type: TEXT (invoice, payment, expense, refund, credit, debit)
- category: TEXT
- description: TEXT (Required)
- reference_number: TEXT
- invoice_number: TEXT
- payment_method: TEXT (cash, mpesa, bank_transfer, cheque, card, other)
- payment_status: TEXT (pending, completed, failed, cancelled)
- transaction_date: DATE
- due_date: DATE
- notes: TEXT
- attachments: TEXT[]
- tags: TEXT[]
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 3. **client_transactions_usd** (USD Transactions)

```sql
Same structure as client_transactions_kes
Different payment methods: (cash, wire_transfer, bank_transfer, cheque, card, paypal, other)
```

#### 4. **vehicles** (Optional Asset Tracking)

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- client_id: UUID (Foreign Key to clients, nullable)
- vehicle_number: TEXT (Required, e.g., license plate)
- make: TEXT
- model: TEXT
- year: INTEGER
- vin: TEXT
- vehicle_type: TEXT (truck, van, car, trailer, other)
- status: TEXT (active, inactive, maintenance, sold, retired)
- purchase_price: DECIMAL(15,2)
- current_value: DECIMAL(15,2)
- notes: TEXT
- tags: TEXT[]
- last_service_date: DATE
- next_service_date: DATE
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 5. **client_documents** (Optional)

```sql
- id: UUID (Primary Key)
- client_id: UUID (Foreign Key to clients)
- user_id: UUID (Foreign Key to auth.users)
- document_name: TEXT
- document_type: TEXT (contract, invoice, receipt, agreement, id, other)
- file_url: TEXT
- file_size: INTEGER
- mime_type: TEXT
- description: TEXT
- tags: TEXT[]
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Views

#### **client_summary_kes** & **client_summary_usd**

Automatically calculate:

- Total receivable (invoices + credits)
- Total paid (payments + debits)
- Current balance
- Transaction count
- Last transaction date

### Helper Functions

- `generate_client_code()`: Auto-generates sequential client codes (CLT-0001, CLT-0002, etc.)
- `update_updated_at_column()`: Automatically updates timestamp on record changes
- `update_client_last_transaction()`: Updates client's last transaction date

---

## 📖 User Guide

### Adding a New Client

1. Navigate to **Clients** page
2. Click **"Add Client"** button
3. Fill in required information:
   - Client Name (required)
   - Email, Phone, Business Name (optional)
   - Address (optional)
4. System automatically generates unique Client Code
5. Click **"Add Client"**

### Managing Client Transactions

1. **Search for Client**: Use search bar to find client by name, code, email, or phone
2. **Click on Client Card**: Opens detailed client view
3. **Select Currency Tab**: Choose KES or USD
4. **Add Transaction**:
   - Click "Add Transaction"
   - Select transaction type:
     - **Invoice**: Money owed to you
     - **Payment**: Money received from client
     - **Credit/Debit**: Adjustments
     - **Expense/Refund**: Other transactions
   - Enter amount, description, date
   - Add payment method and reference number
   - Save transaction

### Generating PDF Reports

1. Open client detail page
2. Click **"Download Report"** button
3. PDF automatically downloads with:
   - Client information
   - Financial summary (KES & USD)
   - Complete transaction history
   - Professional formatting

### Managing Vehicles

1. Navigate to **Vehicles** page
2. Click **"Add Vehicle"**
3. Enter vehicle details:
   - Vehicle Number/License Plate
   - Make, Model, Year
   - Vehicle Type (Truck, Van, Car, etc.)
   - Purchase Price & Current Value
   - Assign to Client (optional)
4. Track vehicle status (Active, Maintenance, Sold, etc.)

---

## 👨‍💻 Developer Notes

### Key Design Decisions

1. **Separate Currency Tables**: Instead of a single transactions table with a currency column, we use separate tables (`client_transactions_kes` and `client_transactions_usd`). This provides:

   - Better performance (no need to filter by currency)
   - Clearer data separation
   - Easier reporting
   - Future flexibility

2. **Client Code Auto-Generation**: Uses database function to ensure unique, sequential codes

3. **Row Level Security (RLS)**: All tables have RLS enabled, ensuring users only see their own data

4. **Optimized Indexes**: Strategic indexes on frequently queried columns (client_id, user_id, transaction_date, etc.)

5. **Soft Navigation**: Uses state management instead of routing for faster navigation

### Adding New Features

#### Add a New Transaction Type

1. Update check constraint in migration file
2. Add UI option in ClientDetail.tsx form
3. Update PDF generator if needed

#### Add New Currency

1. Create new table `client_transactions_[currency]`
2. Add tab in ClientDetail component
3. Update dashboard calculations
4. Add to PDF generator

#### Customize PDF Reports

Edit `src/lib/pdfGenerator.ts`:

- Change colors in `setFillColor()` and `headStyles`
- Modify table columns in `autoTable()` config
- Add company logo using `doc.addImage()`

### Performance Optimization

- **Lazy Loading**: Consider implementing for large transaction lists
- **Pagination**: Add for clients with 100+ transactions
- **Caching**: Implement summary caching for frequently accessed data
- **Debounced Search**: Already implemented in search inputs

### Security Considerations

- All database queries use RLS
- User ID automatically added to all inserts
- Input validation on forms
- Supabase handles auth tokens securely

---

## 🎨 UI/UX Highlights

### Color Scheme

- **Primary**: Emerald (client focus)
- **Secondary**: Blue (financial data)
- **Accent**: Purple, Amber (different currencies)
- **Status Colors**:
  - Green: Active, Completed
  - Gray: Inactive
  - Amber: Pending
  - Red: Issues

### Navigation Flow

```
Dashboard → Clients List → Client Detail → (Transactions/Reports)
    ↓
  Vehicles → Vehicle Management
    ↓
  Reports → Generate PDFs
```

### Key UX Features

- **One-Click Actions**: Add client, add transaction, generate report
- **Clear Visual Hierarchy**: Important info stands out
- **Responsive Design**: Works on mobile, tablet, desktop
- **Loading States**: Clear feedback during operations
- **Error Handling**: Friendly error messages
- **Confirmation Dialogs**: Prevent accidental deletions

---

## 📄 Migration Guide

### From Old Finance App

The original personal finance tables are **not migrated**. This is a fresh start with:

- New schema focused on clients
- New components
- New navigation
- Clean database

**Old tables** (income, expenses, debts, etc.) remain in database but are not used.

To access old data:

1. Use Supabase dashboard
2. Export via SQL queries
3. Optional: Create migration script to convert to client format

---

## 🔧 Troubleshooting

### Common Issues

**Client code not generating**

- Ensure `generate_client_code()` function exists in database
- Check database function permissions

**PDF not downloading**

- Check browser popup blocker
- Ensure jsPDF is installed: `npm install jspdf jspdf-autotable`

**Transactions not showing**

- Verify RLS policies are active
- Check user_id matches logged-in user
- Confirm client_id relationship

**Search not working**

- Check indexes exist on clients table
- Verify search term matches client fields

---

## 📝 License

Proprietary - All rights reserved

---

## 🤝 Support

For issues or questions, contact the development team.

---

**Built with ❤️ for exceptional client management**
