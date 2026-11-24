# Reliance Finance Portal — GitHub + Render + MongoDB

## Included
- Original single-page HTML design and existing page/features retained.
- Express backend, MongoDB persistence, admin JWT login, customer login using mobile + Aadhaar, status lookup, and customer profile refresh polling.
- Admin-controlled demo wallet balance stored in MongoDB; customer transfer attempts show the failure message configured by Admin.
- Demo credit score randomly generated from 600–800 and saved with a loan/customer record.
- Render Blueprint (`render.yaml`) and environment-variable template.

## Local run
1. Install Node.js 20+.
2. Create a MongoDB Atlas database and database user. In Atlas Network Access, allow Render outbound access (for initial setup, `0.0.0.0/0` is commonly used; use stronger network restrictions where possible).
3. Copy `.env.example` to `.env` and fill `MONGODB_URI`.
4. Create a password hash:
   `node scripts/hash-password.js "Use-A-Strong-Password-12+"`
   Put the printed hash in `ADMIN_PASSWORD_HASH`. Set `ADMIN_USERNAME`.
5. Set a long random `JWT_SECRET` (32+ characters).
6. Run `npm install` then `npm start`; open http://localhost:10000.

## GitHub
Create a private repository, upload the contents of this folder (not the parent folder), and push to the default branch.

## Render
Create a new Blueprint from the GitHub repository, or create a Web Service with:
- Build: `npm install`
- Start: `npm start`
- Health check: `/api/health`
Set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH` in Render Environment. Never commit `.env` or secrets.

## Important deployment / security notes
- The supplied source had a hard-coded demo admin password (`admin/admin123`) and a sample customer record. The hard-coded login and sample record have been removed.
- Customer login now requires both registered mobile and Aadhaar; this is a basic second-factor check, NOT OTP verification. Add an SMS OTP provider before public production use.
- This is a starter conversion, not a certified banking/NBFC platform. It does not connect to real bank transfer rails, credit bureau/CIBIL, or RBI systems. The wallet is an internal demo balance only (not a bank deposit or redeemable money). Admin sets each customer wallet balance. Customer transfer attempts are simulated and display the failure reason configured by Admin; no money is sent. Demo credit scores are random values from 600 to 800 and are not bureau/CIBIL scores.
- Aadhaar, PAN and uploaded image/receipt fields in this starter are stored in MongoDB as supplied. Do not use real customer data until you add encryption-at-rest/application-level field encryption, access auditing, consent/retention controls, secure file storage, OTP, and a professional security review. Prefer storing files in object storage rather than large base64 fields.
- The legacy frontend uses synchronous local cache calls for compatibility. Writes are sent to the server asynchronously. Do not close/reload immediately after a save until the success message/refresh confirms persistence. Admin/customer state is scoped by JWT on the API.
- Admin bulk sync is intended for this UI's complete admin table state. Avoid editing the same record concurrently in multiple admin sessions.
