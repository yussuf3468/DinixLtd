# 🌟 Dinix - Professional Business Management System

> **Professional business management with dual-currency support, ultra UX/UI, and mobile-first design**
>
> **Owner: Abdiwali Aden**
>
> **Company: Dinix General Trading**

A beautiful, enterprise-grade business management system designed for modern businesses. Track clients and transactions in **dual currencies** (KES & USD) with an exceptional user interface built with React, TypeScript, Tailwind CSS, and Supabase.

## ✨ Premium Features

- 👥 **Client Tracking** - Auto-generated client codes (CLT-0001), smart search, status tracking
- 💰 **Dual Currency** - Full KES (Kenya Shillings) and USD support with separate transaction tables
- 📊 **Advanced Analytics** - Top clients ranking, monthly trends, real-time statistics
- 📄 **PDF Reports** - Professional branded reports per client or all clients summary
- 🎨 **Ultra UX/UI** - Emerald gradient branding, smooth animations, modern card layouts
- 📱 **Mobile-First** - Touch-optimized, responsive design, bottom navigation
- 🔐 **Secure Authentication** - Supabase Auth with Row Level Security
- ⚡ **Real-time Sync** - Live data updates across all devices
- 🚗 **Asset Tracking** - Optional vehicle/equipment management (hidden by default)
- 📈 **Multi-Period Reports** - Current month, 3/6 months, yearly, or custom date ranges

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Supabase account (free tier available)

### Installation

1. **Clone the repository** (Already done!)

```bash
git clone https://github.com/abdiwaliaden/dinix-general-trading.git
cd dinix-general-trading
```

2. **Install dependencies** (Already done!)

```bash
npm install
```

3. **Setup Supabase Database**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project
   - Run the SQL schema from `supabase/schema.sql`
   - See detailed instructions in `DATABASE_SETUP.md`

4. **Configure Environment**
   - Copy your Supabase URL and anon key
   - Update `.env` file:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. **Run Development Server**

```bash
npm run dev
```

6. **Open in Browser**
   - Navigate to `http://localhost:5173`
   - Sign up and start tracking!

## 📖 Documentation

- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete project overview
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - Step-by-step database setup
- **[ENHANCED_SETUP.md](ENHANCED_SETUP.md)** - Full setup and enhancement guide
- **[DESIGN_REFERENCE.md](DESIGN_REFERENCE.md)** - Quick design pattern reference

## 🎨 Design System

### Color Schemes

- **Income** - Emerald/Teal gradients
- **Expenses** - Red/Pink gradients
- **Debts** - Orange/Red gradients
- **Rent** - Blue/Indigo gradients
- **Reports** - Purple/Pink gradients

### Key Features

- 📱 Mobile-first responsive design
- ✨ Smooth animations and transitions
- 🎯 Touch-friendly interactions (44px+ targets)
- 🌈 Beautiful gradient backgrounds
- 💫 Glass-morphism effects
- ♿ Accessible (ARIA labels, keyboard navigation)

## 🗄️ Database Schema

### Core Tables

- `profiles` - User profile information
- `income` - Income tracking (daily/monthly/yearly)
- `expenses` - Expense tracking with categories
- `debts` - Debt management with payments
- `debt_payments` - Payment history
- `rent_settings` - Rent configuration
- `rent_payments` - Rent payment history
- `savings_goals` - Savings targets
- `budgets` - Budget management

### Security

- ✅ Row Level Security (RLS) enabled
- ✅ Users can only access their own data
- ✅ Secure authentication with Supabase Auth
- ✅ Environment variables for sensitive data

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Build Tool**: Vite

## 📱 Component Status

- ✅ **Auth** - Login/Signup with validation
- ✅ **Layout** - Responsive navigation
- ✅ **Modal** - Reusable animated modal
- ✅ **Income** - Enhanced with mobile-first design
- ⏳ **Expenses** - Ready for enhancement
- ⏳ **Debts** - Ready for enhancement
- ⏳ **Rent** - Ready for enhancement
- ⏳ **Dashboard** - Ready for enhancement
- ⏳ **Reports** - Ready for enhancement

## 🎯 Roadmap

### Phase 1 (Current)

- [x] Project setup
- [x] Authentication
- [x] Basic CRUD operations
- [x] Database schema
- [x] Mobile-first design system
- [ ] Complete Supabase integration
- [ ] Enhance all components

### Phase 2 (Next)

- [ ] Data visualization (charts)
- [ ] Export to CSV
- [ ] Recurring transactions
- [ ] Budget alerts
- [ ] Notifications

### Phase 3 (Future)

- [ ] Dark mode
- [ ] Multi-currency support
- [ ] Expense receipt uploads
- [ ] Financial goals tracking
- [ ] Bill reminders
- [ ] Mobile app (React Native)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend and authentication
- [Tailwind CSS](https://tailwindcss.com) - Styling framework
- [Lucide](https://lucide.dev) - Beautiful icons
- [Vite](https://vitejs.dev) - Lightning fast build tool

## 📧 Contact

Project Link: [https://github.com/yussuf3468/myFinance](https://github.com/yussuf3468/myFinance)

---

**Built with ❤️ for better personal finance management**

_Start tracking your finances today!_ 💰
