# 🚀 Quick Start Guide - Client Management System

## Step-by-Step Setup (5 Minutes)

### 1. Database Setup

1. **Login to Supabase** (https://supabase.com)

2. **Run the Migration**:

   - Go to SQL Editor in your Supabase project
   - Copy the contents of `supabase/migrations/001_create_cms_schema.sql`
   - Paste and run it
   - ✅ This creates all tables, functions, and policies

3. **Verify Tables Created**:
   - Check Table Editor
   - Should see: `clients`, `client_transactions_kes`, `client_transactions_usd`, `vehicles`

### 2. Environment Variables

Create `.env` file in project root:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Get these from: Supabase Dashboard → Settings → API

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. First Login

1. Open http://localhost:5173
2. Sign up with email/password
3. You're in! 🎉

---

## 📱 First Steps in the App

### Add Your First Client

1. Click **"Clients"** in navigation
2. Click **"Add Client"** button
3. Fill in:
   - Client Name: "John Doe"
   - Email: john@example.com
   - Phone: +254 700 000000
4. Click **"Add Client"**
5. Client code auto-generates (e.g., CLT-0001)

### Add a Transaction

1. Click on the client card you just created
2. Choose currency tab (KES or USD)
3. Click **"Add Transaction"**
4. Fill in:
   - Type: Invoice (for money owed) or Payment (for money received)
   - Amount: 10000
   - Description: "Website development"
   - Date: Today
   - Payment Method: M-Pesa
   - Reference: INV-001
5. Click **"Add Transaction"**
6. See it appear in the list!

### Generate PDF Report

1. From client detail page
2. Click **"Download Report"**
3. PDF downloads automatically with:
   - Client info
   - Financial summary
   - All transactions

### Add a Vehicle (Optional)

1. Click **"Vehicles"** in navigation
2. Click **"Add Vehicle"**
3. Fill in:
   - Vehicle Number: KXX 123Y
   - Make: Toyota
   - Model: Hilux
   - Type: Truck
4. Optionally assign to a client
5. Track purchase price and current value

---

## 🎯 Quick Tips

### Search is Powerful

- Search clients by: name, code, email, phone, or business name
- Instant results as you type
- Use filters to narrow by status

### Dual Currency Magic

- Each client has **two separate** financial records
- Switch between KES and USD with tabs
- Completely independent tracking

### Transaction Types Explained

- **Invoice**: Money your client owes you
- **Payment**: Money you received from client
- **Credit**: Add money to client's account
- **Debit**: Deduct from client's account
- **Expense**: Money you spent on client's behalf
- **Refund**: Money you returned to client

### Understanding Balance

- **Total Invoiced**: All invoices + credits
- **Total Paid**: All payments + debits
- **Balance Due**: What client still owes (Invoiced - Paid)

### Dashboard Stats

- **Total Clients**: All clients in system
- **Active Clients**: Clients with status = "active"
- **Revenue**: All completed payments received
- **Pending**: Outstanding invoices not yet paid

---

## 🔄 Common Workflows

### Monthly Client Billing

1. Navigate to client detail page
2. Add transaction:
   - Type: Invoice
   - Amount: Monthly fee
   - Description: "Services for [Month]"
   - Due Date: End of month
3. Client sees balance increase

### Recording Payment

1. Client detail page
2. Add transaction:
   - Type: Payment
   - Amount: What they paid
   - Payment Method: How they paid
   - Reference: Transaction ID
3. Balance automatically updates

### End of Month Reporting

1. Go to each client detail page
2. Click "Download Report"
3. PDF shows complete month's activity
4. Send to client or keep for records

---

## ⚡ Keyboard Shortcuts & Speed Tips

### Fast Navigation

- Use search to quickly find clients
- Recently added clients show on dashboard
- Click client name anywhere to open detail page

### Batch Operations

Currently transactions are individual. For future:

- Import CSV for bulk transactions
- Mass PDF generation

---

## 🛡️ Data Safety

### Your Data is Secure

- Supabase handles encryption
- Row Level Security (RLS) enabled
- Only you can see your data
- Each user completely isolated

### Backups

- Supabase automatically backs up your data
- Export data anytime via Supabase dashboard
- Keep PDF reports as additional backup

### Multi-Device Access

- Login from anywhere
- Same data on phone, tablet, computer
- Real-time synchronization

---

## 📊 Sample Data (Optional)

Want to see the system in action? Add these sample clients:

### Client 1

- Name: ABC Corporation
- Code: CLT-0001 (auto)
- Business: Import/Export
- Email: contact@abc-corp.com
- Phone: +254 722 123456

Add transactions:

1. Invoice (KES): 50,000 - "Monthly retainer"
2. Payment (KES): 50,000 - "Payment received"
3. Invoice (USD): 500 - "International consulting"

### Client 2

- Name: XYZ Logistics
- Code: CLT-0002 (auto)
- Business: Logistics Services
- Phone: +254 733 987654

Add vehicle:

- Vehicle: KBA 456C
- Make: Isuzu
- Type: Truck
- Assign to XYZ Logistics

---

## 🎨 Customization Ideas

### Brand Colors

Edit `src/components/Layout.tsx` and component files to change:

- Primary color (currently emerald)
- Secondary colors
- Gradient styles

### PDF Header

Edit `src/lib/pdfGenerator.ts`:

- Change header color
- Add your logo
- Customize footer text

### Add Fields

Want to track more info?

1. Add column in Supabase
2. Add input field in form
3. Display in component

---

## ❓ FAQ

**Q: Can I use this offline?**
A: No, requires internet connection for Supabase

**Q: How many clients can I add?**
A: Unlimited! Supabase free tier supports lots of data

**Q: Can multiple users share clients?**
A: Not currently. Each user has their own isolated data

**Q: What about invoices?**
A: This tracks transactions. Use reference numbers to link to external invoicing systems

**Q: Can I export data?**
A: Yes! Use Supabase dashboard or generate PDF reports

**Q: Is there a mobile app?**
A: The web app is fully responsive - works great on mobile browsers

**Q: Can I track expenses per client?**
A: Yes! Use transaction type "Expense"

**Q: How do I delete a client?**
A: Currently need to use Supabase dashboard. Deletion button coming soon!

---

## 🚨 Troubleshooting

### "Loading..." forever

- Check `.env` file has correct Supabase credentials
- Verify Supabase project is active
- Check browser console for errors

### Can't add client

- Verify migration ran successfully
- Check `generate_client_code()` function exists
- Look for errors in browser console

### Transactions not showing

- Confirm you're on correct client detail page
- Check currency tab (KES vs USD)
- Refresh the page

### PDF won't download

- Disable popup blocker
- Try different browser
- Check jsPDF is installed

---

## 📞 Need Help?

1. **Check Console**: Press F12 → Console tab for errors
2. **Check Database**: Supabase dashboard → Table Editor
3. **Review Documentation**: See CMS_README.md for details

---

## 🎉 You're Ready!

Your Client Management System is set up and ready to use. Start adding clients and tracking transactions!

**Pro Tip**: Add a few test clients first to get comfortable with the system before adding real data.

---

Last Updated: December 16, 2025
