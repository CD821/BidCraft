BIDCRAFT v0.11 - QUICK START
===========================

WHAT'S NEW

- Choose profit markup or margin in each Estimate summary.
  Markup adds a percent to cost including overhead; margin is profit as a
  percent of the selling price after overhead and before tax (less than 100%).
  For $100 cost, 20% markup is $120; 20% margin is $125 before tax.
- Other costs can now be priced per unit or as a flat total in each estimate.
  Flat totals are charged once and do not multiply by quantity or waste.
- Existing estimates keep markup and per-unit Other costs by default.
- No additional Supabase SQL update is required for these pricing options.
- Fixed asset paths when refreshing estimate URLs on Vercel or the local app.
- Added company role permissions:
  owner/admin can manage company settings, members, and price book.
  estimator can create and edit estimates.
  viewer can view, print, export, and download, but cannot edit.
- Added a company delete button for owners in Workspace.
- Fixed the Supabase company-delete trigger issue.
- Added explicit Supabase Data API grants for newer Supabase projects.
- Edit project name, client, proposal number, and status from the Estimate tab.
- Added Supabase/Vercel planning files for future logins, companies, and audit logs.
- Add and manage trades from Settings.
- Custom trades appear in Estimate and Price Book trade dropdowns.
- Materials is now a project-specific purchasing list, separate from estimate lines.
- Add quantity, unit cost, tax rate, delivery fee, and notes for each material.
- Sort the material list by any data heading and export it to CSV.
- Material and labor rates are edited directly in each estimate.
- Estimate rates apply only to that project; Price Book values are defaults.
- Starting v0.3 automatically closes an older BidCraft server first.
- Material costs can be priced per unit or as a flat total.
- Labor costs can be priced hourly, per unit/SF, or as a flat total.
- Search projects by project, customer, proposal number, status, or address.
- Improved spacing and alignment in the Projects table.

WINDOWS INSTALL

1. Extract the entire BidCraft Portable folder.
2. Double-click "Start BidCraft.bat".
3. BidCraft opens in Chrome or your default browser.
4. In Chrome or Edge, click "Install app" in BidCraft's lower-left corner.
   You can also use the browser menu and choose "Install BidCraft".
5. After installation, launch BidCraft like a normal desktop app.

The first launch uses http://127.0.0.1:8787 on your own computer.
Your projects are stored locally in that browser profile.

IMPORTANT BACKUPS

Open Settings in BidCraft and use "Download backup" regularly.
Clearing browser site data can remove locally stored estimates.

PRINTING PROPOSALS

Open an estimate, select Proposal, then click "Print / Save PDF".
Choose a printer or "Save as PDF" in the browser print dialog.

MOVING TO ANOTHER COMPUTER

1. On the old computer, download a backup from Settings.
2. Install/open BidCraft on the new computer.
3. Use Settings > Import backup.

STOPPING THE PORTABLE SERVER

Double-click "Stop BidCraft.bat".

The compiled app is inside the "dist" folder. It can also be placed on any
HTTPS static website for installation on Mac, Android, iPhone, or other devices.
