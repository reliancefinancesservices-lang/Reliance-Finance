# Reliance Finance — deployment project (Hindi)

## Project layout
- `frontend/index.html`: original HTML and CSS layout, extracted from the supplied file
- `frontend/app.js`: original UI interactions, with server-backed admin/customer lookups
- `frontend/api-bridge.js`, `frontend/app-loader.js`: compatibility and loading
- `backend/src/server.js`: Express API, MongoDB persistence, admin JWT, customer-scoped session
- `backend/src/make-password-hash.js`: admin password hash generator
- `backend/render.yaml`: Render web-service blueprint
- `backend/.env.example`: required environment variables

## Important: safety before live use
The original customer login asks for only a mobile number OR Aadhaar number, without OTP or password. The API no longer exposes the full customer list publicly, but that login method is not strong enough to protect real KYC/financial data. This package is a deployable starter/demo. Before adding real customer records, implement OTP verification through an SMS provider, use an appropriately verified customer session, add field-level response filtering, and review all loan/payment claims and regulatory requirements. Do not upload real Aadhaar, PAN, bank information or customer receipts to a demo deployment. Never collect fees from customers unless the business is legally authorized and the fee is legitimate and clearly disclosed.

## Local setup
1. Install Node.js 20+.
2. Create a free MongoDB Atlas cluster. Create a database user, set Network Access, and copy the driver connection string.
3. Copy `backend/.env.example` to `backend/.env`. Set `MONGODB_URI`, a unique `ADMIN_USERNAME`, a strong `JWT_SECRET` (32+ random characters), and later `ADMIN_PASSWORD_HASH`.
4. In a terminal:
   ```bash
   cd backend
   npm install
   node src/make-password-hash.js "Your-long-unique-password"
   ```
   Copy the printed hash into `ADMIN_PASSWORD_HASH` in `.env`.
5. Run `npm start` and visit `http://localhost:3000`. Health check: `/api/health`.

## Deploy on Render free web service
1. Push the extracted project to a GitHub repository.
2. In Render, create a Web Service and connect that repo.
3. Root Directory: `backend`; Build Command: `npm install`; Start Command: `npm start`.
4. Add all variables from `.env.example` in Render Environment settings. Do not commit `.env` or secrets to GitHub.
5. In MongoDB Atlas, configure Network Access for the Render service. Avoid broad public access where possible.
6. Deploy and test `/api/health`, admin login, creating a demo loan application, status lookup, customer profile, admin edits, approval/rejection, and payment request/receipt flows.

## GitHub Pages note
GitHub Pages only serves static files and cannot run Express or connect securely to MongoDB. The easiest free starter is to serve the frontend and API together from Render, with GitHub as the source repository. If you separately use GitHub Pages for the frontend, configure a separate API base URL and CORS; this package currently expects same-origin `/api` paths.

## Known limitations
- Existing single-field customer lookup is retained for UI compatibility but needs OTP to be safe for real data.
- Customer login uses a scoped token and can update only that customer's record. Anonymous application submission can create new records only.
- The original UI contains client-side payment request and loan-management interactions; verify each one after deployment. Do not consider this a regulated financial product or production banking application until a security and legal review is completed.
