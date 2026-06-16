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
- Waste factors and aggregated purchasing lists
- Overhead, profit markup, and configurable tax basis
- Print-ready US Letter proposals
- Browser Print / Save as PDF
- JSON backup and restore
- Local autosave and PWA installation

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
