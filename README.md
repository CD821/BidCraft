# BidCraft

BidCraft is an offline-first multi-trade estimating PWA for small contractors.

Price Book costs are optional starting defaults. When an item is added to an
estimate, its rates are copied into that project and can be changed without
affecting the Price Book or any other estimate.

## Included workflows

- Multiple projects and proposals
- Reusable multi-trade price book
- Per-unit or flat material costs
- Hourly, per-unit/SF, or flat labor costs
- Searchable, aligned project list
- Project purchasing lists with material costs, tax, delivery, notes, and sorting
- Editable trade list shared by estimates and the price book
- Editable project details on the Estimate and Proposal screens
- URL routes for projects, workspace, settings, and estimate tabs
- Estimate file attachments for drawings, PDFs, photos, quotes, and notes
- Optional Supabase login mode
- Create/select companies
- Edit company names and manage company member roles/access
- Owner-only company deletion
- Role permissions for owner, admin, estimator, viewer, and platform admin
- Company-scoped projects, price books, trades, and proposal settings
- Join-company requests with owner/admin approval
- Supabase audit logs for project, price-book, and company-setting changes
- Waste factors and aggregated purchasing lists
- Overhead, profit markup, and configurable tax basis
- Print-ready US Letter proposals
- Browser Print / Save as PDF
- JSON backup and restore
- Local autosave and PWA installation

## Supabase / Vercel

BidCraft still works as a local/offline app when Supabase variables are missing.
When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel, the app
shows login, company workspace, cloud save/load, join requests, and change logs.

Run `supabase/schema.sql` in Supabase SQL Editor before deploying the connected
version. See `SUPABASE-VERCEL-SETUP.md` for the setup checklist.

## Development

```powershell
pnpm install
pnpm dev
```

## Production build

```powershell
pnpm build
```

On Windows, double-click `Start BidCraft.bat` after building. The local server
opens `http://127.0.0.1:8787`, which can be installed from Chrome or Edge.

## GitHub Pages

Use the included GitHub Actions workflow instead of deploying the repo root.
GitHub Pages should publish the built `dist` folder. See
`GITHUB-PAGES.md` for setup steps.
