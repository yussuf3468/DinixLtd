# 🚀 Deployment Guide - Ezary CMS

## Production Checklist ✅

Before deploying, ensure:

- [x] Environment variables configured
- [x] Database schema deployed to Supabase
- [x] Production build tested locally
- [x] All sensitive data gitignored
- [x] Code pushed to GitHub

## Environment Variables Required

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment Options

### Option 1: Vercel (Recommended) ⚡

**Why Vercel?**

- Free tier with great performance
- Automatic deployments from GitHub
- Easy environment variable management
- Perfect for React/Vite apps

**Steps:**

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import `yussuf3468/Ezary_v1` from GitHub
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Deploy"
7. Your app will be live at `your-project.vercel.app`

### Option 2: Netlify 🌐

**Steps:**

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select `Ezary_v1`
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add Environment Variables in Site Settings
6. Click "Deploy site"

### Option 3: GitHub Pages (Static)

**Steps:**

1. Install gh-pages:

   ```bash
   npm install --save-dev gh-pages
   ```

2. Add to `package.json`:

   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. Deploy:

   ```bash
   npm run deploy
   ```

4. Enable GitHub Pages in repository settings

**Note**: Environment variables must be embedded during build for static hosting.

## Post-Deployment Steps

### 1. Test Your Deployment

- [ ] Login functionality works
- [ ] Can create new clients
- [ ] Can add transactions (both KES and USD)
- [ ] PDF export works
- [ ] Reports display correctly
- [ ] Mobile responsive

### 2. Setup Custom Domain (Optional)

**Vercel:**

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

**Netlify:**

1. Go to Domain Settings
2. Add custom domain
3. Configure DNS

### 3. Enable Analytics (Optional)

**Vercel Analytics:**

```bash
npm install @vercel/analytics
```

Add to `src/main.tsx`:

```typescript
import { Analytics } from "@vercel/analytics/react";

// Add <Analytics /> to your App component
```

### 4. Setup Monitoring

**Recommended Tools:**

- [Sentry](https://sentry.io) - Error tracking
- [LogRocket](https://logrocket.com) - Session replay
- Vercel/Netlify built-in analytics

## Database Setup

Ensure your Supabase database is configured:

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Run the schema from `supabase/schema.sql`
4. Verify tables are created:
   - clients
   - client_transactions_kes
   - client_transactions_usd
   - savings_goals (optional)
   - debts (optional)

## Security Considerations

### Row Level Security (RLS)

Ensure RLS is enabled on all tables:

```sql
-- Enable RLS on clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own clients
CREATE POLICY "Users can view own clients" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON clients
  FOR DELETE USING (auth.uid() = user_id);

-- Repeat for transactions tables
```

### API Keys

- ✅ **ANON key** in frontend (safe for public use)
- ❌ **SERVICE key** never in frontend
- ✅ All keys in environment variables
- ❌ Never commit `.env` to git

## Performance Optimization

### 1. Enable Compression

Most platforms enable this by default. For custom servers:

```javascript
// Express example
app.use(compression());
```

### 2. CDN Caching

Vercel and Netlify automatically provide CDN caching.

### 3. Image Optimization

If you add images later:

- Use WebP format
- Compress before uploading
- Use lazy loading

## Troubleshooting

### Build Fails

**Issue**: TypeScript errors

```bash
npm run typecheck
```

Fix errors before deploying.

**Issue**: Missing dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

### Runtime Errors

**Issue**: "Missing Supabase environment variables"

- Verify environment variables are set in deployment platform
- Restart deployment after adding variables

**Issue**: Database connection fails

- Check Supabase project URL is correct
- Verify ANON key is valid
- Ensure RLS policies are configured

### Performance Issues

**Issue**: Slow initial load

- Enable code splitting
- Consider lazy loading components
- Optimize bundle size

## Maintenance

### Regular Updates

```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### Backup Database

Regularly backup your Supabase database:

1. Go to Supabase Dashboard
2. Database → Backups
3. Enable automatic backups (Pro plan)

### Monitor Usage

Check your platform's dashboard:

- **Vercel**: Usage tab
- **Netlify**: Usage and billing
- **Supabase**: Database usage, Auth usage

## Support

- **Documentation**: See README.md
- **Issues**: Open issue on GitHub
- **Supabase**: [docs.supabase.com](https://docs.supabase.com)

---

## Quick Deploy Command Reference

```bash
# Build locally
npm run build

# Preview build
npm run preview

# Deploy to Vercel
vercel

# Deploy to Netlify
netlify deploy --prod

# Update dependencies
npm update && npm audit fix

# Check bundle size
npm run build -- --report
```

---

**🎉 Your Ezary CMS is now production ready!**

Access your deployed app and start managing clients professionally.
