# 🗄️ Supabase Database Setup Instructions

## Quick Setup (5 minutes)

### Step 1: Access Supabase Dashboard

1. Go to https://app.supabase.com
2. Sign in or create an account
3. Create a new project or select existing one
4. **Note down** your project URL and anon key (you'll need these)

### Step 2: Run SQL Schema

1. In your Supabase project dashboard, click on **SQL Editor** in the left sidebar
2. Click **New Query** button
3. Open the file `supabase/schema.sql` from this project
4. Copy ALL the content (Ctrl+A, Ctrl+C)
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for completion (should take ~10 seconds)

### Step 3: Verify Tables Created

1. Click on **Table Editor** in the left sidebar
2. You should see these tables:
   - ✅ profiles
   - ✅ income
   - ✅ expenses
   - ✅ debts
   - ✅ debt_payments
   - ✅ rent_settings
   - ✅ rent_payments
   - ✅ savings_goals
   - ✅ budgets

### Step 4: Configure Environment Variables

1. Go to **Project Settings** (gear icon)
2. Click on **API** tab
3. Copy the following:

   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon public key** (long string starting with eyJ...)

4. Update your `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

5. Save the file

### Step 5: Restart Development Server

```bash
# Stop the current server (Ctrl+C in terminal)
# Then restart it:
npm run dev
```

## 🎉 You're Done!

Your database is now set up with:

- ✅ All tables created
- ✅ Row Level Security (RLS) enabled
- ✅ Policies configured (users can only see their own data)
- ✅ Triggers for automatic timestamp updates
- ✅ Views for analytics
- ✅ Indexes for better performance

## 🧪 Test Your Setup

1. **Sign Up**: Create a new account in the app
2. **Add Income**: Add your first income record
3. **Add Expense**: Track your first expense
4. **Verify Data**: Check Supabase Table Editor to see your data

## 📊 Database Schema Overview

### Core Tables

#### `profiles`

Stores user profile information

- id (UUID) - Links to auth.users
- email
- full_name
- avatar_url
- currency

#### `income`

Tracks all income sources

- amount (Decimal)
- description
- type (daily/monthly/yearly/one-time)
- date
- is_recurring

#### `expenses`

Tracks all expenses

- amount (Decimal)
- category
- description
- date
- payment_method
- tags

#### `debts`

Manages debt tracking

- creditor_name
- amount (Decimal)
- amount_paid (Decimal)
- interest_rate
- due_date
- status (active/paying/cleared)

#### `debt_payments`

Records debt payments

- debt_id (FK to debts)
- amount
- payment_date
- notes

#### `rent_settings`

Stores rent configuration

- monthly_amount
- due_day (1-31)
- landlord info
- lease dates

#### `rent_payments`

Tracks rent payment history

- amount
- payment_date
- month (YYYY-MM)
- payment_method
- receipt_number

#### `savings_goals`

Manages savings targets

- goal_name
- target_amount
- current_amount
- target_date
- is_achieved

#### `budgets`

Budget management

- category
- amount
- period (weekly/monthly/yearly)
- start_date
- end_date
- alert_threshold

### Security Features

🔒 **Row Level Security (RLS)**: Every table has RLS enabled

🔒 **Policies**: Users can only:

- View their own data
- Insert their own data
- Update their own data
- Delete their own data

🔒 **Triggers**: Automatic updates:

- `updated_at` timestamp on every update
- Debt `amount_paid` updates on new payment
- Auto-status change when debt is cleared

### Performance Optimizations

⚡ **Indexes** created on:

- user_id + date columns (for fast date queries)
- user_id + category columns (for category filtering)
- user_id + status columns (for status filtering)
- Tags (GIN index for array searches)

## 🔧 Common Issues & Solutions

### Issue: "relation already exists"

**Solution**: Tables are already created. You can skip this step or drop and recreate.

### Issue: "permission denied"

**Solution**: Make sure you're running the SQL as the project owner.

### Issue: "Missing environment variables"

**Solution**: Double-check your `.env` file has correct URL and key.

### Issue: "Failed to fetch"

**Solution**: Check your internet connection and Supabase project status.

### Issue: "Row Level Security Policy violation"

**Solution**: Make sure user is logged in before trying to access data.

## 📱 Testing Data Sync

1. **Add data on Desktop**

   - Log in
   - Add some income/expenses

2. **Check on Mobile**

   - Open same URL on mobile
   - Log in with same account
   - Data should be synced ✅

3. **Verify in Supabase**
   - Go to Table Editor
   - Select a table (e.g., `income`)
   - You should see your data

## 🚀 Next Steps

After successful database setup:

1. ✅ Test user registration
2. ✅ Test login/logout
3. ✅ Add sample data
4. ✅ Test all CRUD operations
5. ⏳ Enhance remaining components (Dashboard, Debts, Rent, Reports)
6. ⏳ Add data visualizations
7. ⏳ Deploy to production

## 📚 Useful Supabase Links

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Editor](https://supabase.com/docs/guides/database/overview)
- [API Reference](https://supabase.com/docs/reference/javascript/introduction)

## 🆘 Need Help?

If you encounter issues:

1. Check Supabase project status
2. Verify .env configuration
3. Check browser console for errors
4. Check network tab for failed requests
5. Review Supabase logs in dashboard

---

**Your database is production-ready with proper security and optimizations! 🎉**
