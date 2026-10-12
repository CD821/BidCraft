# GitHub Pages Setup

BidCraft is a Vite app. GitHub Pages must publish the built `dist` folder, not
the source `index.html` in the repo root.

## One-Time GitHub Settings

1. Upload or push this full app folder to your GitHub repo.
2. Go to `Settings > Pages`.
3. Under `Build and deployment`, change `Source` from `Deploy from a branch` to
   `GitHub Actions`.
4. Push a commit to `main`, or open `Actions` and run
   `Deploy BidCraft to GitHub Pages`.

The workflow in `.github/workflows/deploy-pages.yml` will install dependencies,
build the app, and publish `dist`.

## Why the Blank Page Happened

If Pages is set to `Deploy from a branch` using `/ (root)`, GitHub serves the
development `index.html`. That file references `/src/main.jsx`, which is source
code and cannot run directly on GitHub Pages.

Using GitHub Actions fixes this by serving the compiled files from `dist`.
