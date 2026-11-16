# LayerPrice — 3D Printing Calculator (Vercel edition)

Bilingual Arabic/English Angular calculator with a compact admin dashboard. No customer accounts or traditional database. The public calculator supports multiple material/color rows, time per copy and quantity. The admin can update materials and pricing settings.

## 1. Run locally (Windows)

Use Node.js 24.x. In the project folder:

```powershell
npm.cmd install
npm.cmd start
```

Open http://localhost:4200/ or http://localhost:4200/admin/login.
Local-only login: `admin` / `admin123`. Angular proxies `/api` to the local Node server on 127.0.0.1:3001. Local changes persist in `.local-data/config.json` (Git-ignored). No Vercel account is required for local development. You can override local credentials with environment variables before `npm.cmd start`.

If upgrading, copy your existing `.local-data/config.json` into the same relative location in this project to preserve local data. Do not commit it.

## 2. Deploy to Vercel via GitHub

1. Push the contents of this project folder (the folder with `package.json` and `vercel.json`) to GitHub. Remove the old `netlify/` folder and `netlify.toml` from the Git repository when upgrading. Do not copy old `node_modules`, `dist`, `.env`, or `.local-data` into Git.
2. In Vercel, Add New > Project, import the repository and select the project root. `vercel.json` sets Angular, the build command `npm run build`, output directory `dist/print-calculator/browser`, and admin SPA routes. Install command can remain the default. Use Node.js 24.x.
3. In the project Settings > Environment Variables, add the following for **Production** (and separately for any preview you intend to use):

   - `ADMIN_USERNAME`: the username you choose, e.g. `admin`.
   - `ADMIN_PASSWORD`: a strong new password (the production API rejects `admin123`).
   - `SESSION_SECRET`: a random value of at least 32 characters. Generate it locally using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

4. In the Vercel project's Storage tab, create a Blob store, select **Private**, and connect it to this project for Production. Vercel sets `BLOB_READ_WRITE_TOKEN` automatically when connected. Do not expose this token to Angular or commit it. A public Blob store is not compatible with this implementation.
5. Redeploy the Production deployment after adding variables and storage. If the first build has already been deployed, this redeployment is necessary to apply the variables.
6. Open the deployed domain. Verify `/api/catalog` returns JSON, the guest calculator works, and `/admin/login` accepts the configured production username/password. Change a price, refresh the admin and test a new estimate from another browser. An unauthenticated request to `/api/admin/config` should return HTTP 401.

Production stores materials and settings as two JSON objects in the private Blob store. On first use, if an object is missing, the server uses the same demo configuration as before. Reads bypass the CDN cache so changes can be read immediately. Storage failures return an error rather than silently reverting to demo prices. The production API uses a signed HttpOnly, Secure, SameSite=Lax cookie lasting 12 hours. No development credentials are accepted as a fallback.

Existing Netlify Blob data and local JSON are not automatically migrated: enter your production prices once in the new admin dashboard. Keep your old project/data until the new deployment has been verified.

Official references: https://vercel.com/docs/vercel-blob/private-storage and https://vercel.com/docs/functions/runtimes/node-js .

## 3. Tests

```powershell
npm.cmd test
npm.cmd run build
```

The API test uses an in-memory storage adapter, covering public catalog, hidden internal costs, authorization, login, settings/material updates, both pricing modes, invalid input, tampered cookies and logout. It does not contact Vercel Blob. The actual Blob integration and browser production build must be verified in the deployed project.

## Pricing and UI

- Fixed: unit price = sum(weight × selling price per gram) + hours × hourly rate.
- Markup: unit price = (sum(weight × cost per gram) + hours × hourly rate) × (1 + markup/100).
- Total = unit price × quantity. Colors do not change the rate.
- The guest sees only the quoted prices, not material cost or markup settings.
- Arabic is the first-visit default; the language switch persists and changes RTL/LTR. Custom material and color names remain as entered.
- Admin has compact pricing settings, materials table, add/edit dialogs, color tags, and disable/delete actions.
