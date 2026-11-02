# ZeroOne Monorepo

This repository contains the ZeroOne frontend and backend apps in one npm-workspaces monorepo.

## Structure

```text
apps/
  web/  React website and landing page
  api/  Node.js REST API with Express, Sequelize, and MySQL
```

## Commands

Install all workspace dependencies from the repository root:

```bash
npm install
```

Run the website:

```bash
npm start
```

Build the website:

```bash
npm run build:web
```

Test the website:

```bash
npm run test:web
```

Run the API:

```bash
cp apps/api/.env.example apps/api/.env
npm run dev:api
```

The API expects a MySQL database configured through `apps/api/.env`.
The website contact form posts to the API at `REACT_APP_API_URL`, which defaults to `http://localhost:4000` in development.
Copy `apps/web/.env.example` to `apps/web/.env` to configure frontend variables such as `REACT_APP_CHAT_STORAGE_TTL_HOURS`, which defaults to `24`.

## Contact Form Email

The contact form sends email through Microsoft Graph from the API server. Prefer configuring these values from the admin dashboard at `/admin/mail-config`; they will be stored in the database. The same keys can also be set in `apps/api/.env` as fallback values:

```bash
MS_TENANT_ID=your-tenant-id
MS_CLIENT_ID=your-application-client-id
MS_CLIENT_SECRET=your-client-secret-value
MS_SENDER_EMAIL=info@zerooneitinc.com
MS_RECIPIENT_EMAIL=info@zerooneitinc.com
```

The Microsoft Entra app registration must have Microsoft Graph `Mail.Send` application permission with admin consent. The sender mailbox in `MS_SENDER_EMAIL` must exist in your Microsoft 365 tenant.
The Microsoft client secret value does not include its expiration date, so enter the expiration date manually in the admin Mail Config screen.

## Client Quotation Responses

Contract printing uses an A4 service agreement; subscription and POS contracts also include a payment annex based on the supplied POS PDFs: repeated letterhead/footer, watermark, numbered terms, client/scope/pricing tables, and signature blocks. The POS starter wording is imported from `Zero One - POS.pdf` and remains editable in Contracts. Example amounts, minimum periods, grace periods, and termination formulas from the payment PDF are not defaults. Enter the agreed client-specific values under **Contract & payment agreement details** in the quotation editor. **Contract / Save PDF** prints saved quotations; **Print Signed Contract / Save PDF** in response history prints the original signed snapshot. Clients can print the contract in the signing flow without exposing private signature evidence to anyone holding the public link.

Admin **Contracts** (`/admin/contracts`) manages separate terms for one-time projects, custom subscriptions, and POS setup/add-ons. Save the appropriate template before creating a subscription or POS quotation, or enter client-specific terms in the quotation. Saving copies the selected terms into the quotation; later template edits do not alter existing documents or signed history. Run the database migration when deploying to create `contract_templates`.

The quotation editor supports one-time charges, setup fees, requested feature add-ons, and monthly/yearly subscription line items. `total` is the one-time amount including its discount and tax; `recurringTotal` is the separate subscription amount including recurring tax, per billing period. Discounts apply only to one-time charges. The preview/PDF, client and internal emails, signing review, and history show recurring charges separately. Contract PDF styling can be adapted separately from the quotation layout.

Accepted quotations also queue a separate receipt to the verified client email. The receipt includes a **Review & Sign Contract** link that opens the saved agreement and email-verification flow directly. `CLIENT_WEB_URL` controls the trusted website origin used in email links (defaults to `http://localhost:3000` in development and `https://zerooneitinc.com` in production). The link respects quotation validity and revocation; it contains no signing proof and does not bypass verification. Client and internal notifications are separate queue jobs so retries do not resend an already completed notification to the other audience.

Acceptance uses **email code → explicit quotation acceptance → signing-choice popup → contract signature → payment step**. Choosing **Sign Later** or closing a popup preserves acceptance and the verified signing session in the current tab's `sessionStorage`; refreshing that tab also restores it. The session is bound to the verified email, quotation version, frozen terms, and share link, and expires with the quotation. The ten-minute OTP itself remains single-use. A new tab without that session verifies the accepting email again. Signing opens the complete formatted contract in an isolated preview, then accepts a drawn or typed signature with explicit consent. The standard one-time agreement uses the 20/70/10 payment schedule.

Signing preserves the original acceptance timestamp and terms, updates response history, and atomically queues separate email jobs for the verified client and the billing/sales teams. Each receives a server-generated signed PDF attachment built from the frozen document and recorded signature. Failed email delivery retries without undoing signing or resending a completed job to the other audience. The verified tab can download its signed PDF through the protected `POST /api/quotations/:token/signed-contract` route. Public quotation GETs never include signing sessions or private signatures.

Under **Payment after signing**, set the initial payment percentage and bank/payment instructions before sharing a quotation. One-time quotations default to 20%; subscription/POS initial percentages must be set to match their agreed terms. The payment step calculates initial payment from one-time charges, keeps recurring charges separate, and directs clients to billing when no bank instructions are set. It does not collect payment or mark a payment as received. Requotes still require an email code and requested changes without contract signing.

After a verified single or bulk deletion, one success confirmation is queued for `info@zerooneitinc.com`, listing the removed quotation references, projects, client companies, requesting administrator, and deletion time in Manila. The confirmation is saved in the same transaction as deletion and delivered only after commit, using the existing retrying mail worker. Failed deletion attempts do not generate success emails.

Shared quotations include **Accept Quotation** and **Request Requote**. Both require a six-digit verification code delivered to the client's company or Gmail inbox, then explicit confirmation. Requotes also require a description of the requested changes. This is passwordless email verification; Google or Microsoft account OAuth is not required.

Code delivery uses the Microsoft Graph sender configured in **Mail Config**, with the `MS_*` environment variables above as fallback. Until a valid sender is configured, the client page reports that verification is unavailable and does not record a response. Codes expire after ten minutes, allow five attempts, and can be used once. If a quotation specifies a client email, only that address can respond.

Verification emails use a branded HTML layout with a large selectable code. Clients can select and copy it directly in their email app; no extra link is required. Clipboard access inside email is controlled by the email app. The older `/verification-code` page remains available for previously issued emails.

After verified acceptance, a confirmation is queued for both `billing@zerooneitinc.com` and `sales@zerooneitinc.com` using the same mail sender. It includes the accepted quotation reference, project, client name and verified email, total, message, and acceptance time in Manila. The acceptance and notification are saved in one transaction. A background worker retries temporary delivery failures and resumes pending work after an API restart. Verified requote requests notify only `sales@zerooneitinc.com`, including the changes requested by the client; billing does not receive requote notifications.

The quotation list shows the response status, and the editor shows the verified responder and message. Responses are bound to the reviewed document version; editing the quotation marks an earlier response as outdated. Expired or revoked links cannot submit responses. Run `npm run db:migrate -w apps/api` when deploying to create the verification table and response column.

The editor's **Response history** retains verified requotes, acceptances, client comments, and quotation snapshots across revisions. The quotation list uses icon actions for opening, copying links, and deleting. Checkboxes and **Select all** select quotations on the current page; **Delete selected** uses one verification code for the exact selected group. Codes are sent only to `info@zerooneitinc.com`, expire after ten minutes, allow five attempts, and are bound to the requesting administrator, selection, and quotation versions. Bulk deletion is atomic: if any quotation changes or deletion fails, the entire group remains untouched. Deleting removes quotations from active views and disables their share links while retaining history internally. Run the database migration when deploying to create the history table and `deleted_at` column. Database deletion safeguards can be tested with `RUN_QUOTATION_DB_TESTS=true node --test apps/api/src/utils/quotation-deletion.integration.test.js`; this uses temporary test quotations and mocks email delivery.

Create the auth users table and first superadmin:

```bash
npm run db:migrate -w apps/api
npm run db:seed:superadmin -w apps/api
```

User roles are numeric: `0` is superadmin and `1` is admin.
For local development, `SYNC_DB_ON_START=true` and `SEED_SUPERADMIN_ON_START=true` let `npm start` create/update tables and seed the superadmin automatically.

The website uses clean client-side URLs such as `/about-us` and `/admin/login`.
Your frontend host must rewrite unknown routes to `index.html` so page refreshes work.

## Docker VPS Deployment

The repository includes a Docker Compose production setup with:

- `web`: Nginx serving the built React app and proxying `/api` to the API service
- `api`: Node.js Express API
- `mysql`: MySQL 8.4 with a persistent Docker volume

By default, the `web` service binds to `127.0.0.1:3100` so this stack can run beside other live apps on the same VPS without taking public port `80`.

On the VPS, point these DNS records to the server public IP:

```text
zerooneitinc.com      A      your-vps-ip
www.zerooneitinc.com  A      your-vps-ip
```

Create the production environment file from the sample:

```bash
cp .env.docker.example .env
```

Edit `.env` and replace every password/secret value. Use strong values for:

```bash
MYSQL_ROOT_PASSWORD=
MYSQL_PASSWORD=
JWT_SECRET=
ADMIN_PASSWORD=
```

Build and start the stack:

```bash
docker compose up -d --build
```

Check the running containers:

```bash
docker compose ps
docker compose logs -f api
```

The website will be served on:

```text
http://127.0.0.1:3100
```

The browser calls the API through the same domain:

```text
http://127.0.0.1:3100/api
```

For public traffic, add an external Nginx reverse proxy on the VPS that routes `zerooneitinc.com` and `www.zerooneitinc.com` to `http://127.0.0.1:3100`. For HTTPS, either enable a CDN/proxy such as Cloudflare in front of the VPS or add a certificate manager/reverse proxy on the server.

## GitHub CI/CD

Two GitHub Actions workflows are included:

- `.github/workflows/ci.yml`: runs on pull requests and pushes to `main` or `develop`
- `.github/workflows/deploy.yml`: deploys to the VPS on pushes to `develop` and can also be run manually

CI checks:

```text
npm ci
npm run test:web
npm run build:web
node --check for API entry files
docker compose config validation
```

Before the first deployment, prepare the VPS:

```bash
sudo mkdir -p /opt/zeroone-website
sudo chown -R "$USER":"$USER" /opt/zeroone-website
cd /opt/zeroone-website
```

Create the production env file on the VPS:

```bash
nano .env
```

Use `.env.docker.example` as the template and fill the real production secrets. The GitHub deployment intentionally does not upload `.env`, so production secrets stay only on the server.

Add these GitHub repository secrets in **Settings > Secrets and variables > Actions**:

```text
VPS_HOST      your VPS IP address or zerooneitinc.com
VPS_USER      SSH username, for example ubuntu or root
VPS_PORT      SSH port, usually 22
VPS_SSH_KEY   private SSH key that can connect to the VPS
VPS_APP_DIR   /opt/zeroone-website
```

The deploy workflow packages the checked-out commit, uploads it to `VPS_APP_DIR`, preserves the server `.env`, and runs:

```bash
docker compose --env-file .env up -d --build --remove-orphans
```

Visitor country lookup uses the no-signup `country.is` API from the backend. The lookup is cached in memory
for 24 hours per IP address. If the lookup service is unavailable, visitor tracking still works, but countries
display as `Unknown`.

### Uploaded PDF contracts

Contracts provides **Default Contract** and **Uploaded PDF** options for each quotation type. Uploading selects the PDF for new quotations without changing the saved default text or formatting. The default editor remains under **Edit default contract**, and administrators can switch back at any time. PDF uploads are limited to 2 MB / 100 pages and must be readable, unencrypted PDFs. Run the database migration when deploying to create private `contract_files` storage and the template source fields. Files are stored in the database rather than the public uploads directory.

Each quotation snapshots its selected PDF ID, filename, size, page count, and SHA-256 hash. Replacing a template PDF creates a new file version; existing quotations, signing proofs, response history, and queued signed copies continue to reference the assigned version. The client reviews that PDF and e-signs through the existing verified session. Signed copies preserve the uploaded pages and append an acceptance/signature page linked to the PDF hash and quotation. They are downloaded and emailed through the existing signed-copy flow. PDF pages are not automatically filled or reformatted; client details are recorded on the added signing page. Bank/payment instructions remain a separate step after signing.

### Monthly subscription billing

Open **Sales & Contract → Billing** (`/admin/billing`) to manage monthly billing. Run the API database migration
before using it (`npm run db:migrate -w apps/api`). Select a custom monthly
subscription with a currently accepted quotation and signed contract, record its
actual system go-live date, choose the billing month and due date, and generate a
statement. Download or preview its PDF from Billing history and send it manually
to the client. No automatic email or payment collection is triggered.

Statements snapshot the client's recurring charges, tax, and payment instructions;
setup fees and other one-time charges are excluded. A subscription can have one
statement per calendar month. Billing cannot precede go-live; the first statement
records the go-live date for later months. Statements use the full monthly amount
without automatic proration. Due dates initially default to seven days after issue
and can be changed before generation. Saved statements retain their original
amounts and client details if the quotation is subsequently edited.

### Client records

The admin sidebar includes **Client Record**, with Custom Subscription and One-time
Payment tabs. Use **Add Client** to register a client directly with their payment type, name,
email, contact person, and address. The directory also includes clients from
active saved quotations; POS is excluded. Matching client name and email are grouped within each payment type.
Search by client, email, contact person, project, or quotation reference, then open
a record to review quotation/contract status and linked monthly bills. Directly added clients remain available without a quotation. Matching quotations
are linked by payment type, normalized client name, and email; duplicate client
registrations within the same payment type are rejected. Subscription records also
link to Billing and allow previously generated billing PDFs to be downloaded.

### Manual billing statements and client links

In **Sales & Contract → Billing**, select **Manual billing statement**, enter the client,
line items, issue/due dates, tax, and payment instructions, then **Generate Billing**.
Manual billing does not require a quotation or signed subscription. The PDF uses the
same company logo as quotations. **Copy Client Link** creates an unguessable link
that opens the PDF without a login; anyone holding that link can view it.
**Disable Link** revokes access; generating another link creates a new token.
Run `npm run db:migrate -w apps/api` before deploying this change. Client links
need the deployed site/API to be publicly reachable; localhost links work only locally.

### Email billing statements

Saved billing statements offer **Send to Client**. Review the recipient, optional CC addresses, and
message, then send the PDF attachment using **billing@zerooneitinc.com** as both
sender and reply address, with a CC copy to the billing mailbox. Billing reuses Mail Config's Microsoft Graph credentials;
the application needs permission to send from the billing mailbox. Other mail
continues to use the configured sender. The email includes a client PDF link when
`CLIENT_WEB_URL` is configured with a public HTTPS site; local emails attach the PDF.
The UI records Microsoft's acceptance time and recipient, which does not guarantee
inbox delivery. Reopen the send dialog to intentionally send another copy.
No client email is sent automatically when a statement is saved.

Manual billing now defaults to non-VAT: PDFs omit the Tax column and VAT summary
row and include the supplied non-VAT payment-notification note. Existing statements
with recorded VAT retain their tax details. **Advance payment / deduction** reduces
the amount due after charges (and recorded VAT where applicable); enter optional
deduction details for the PDF. Deductions must be nonnegative and cannot exceed
the total. Full deduction produces zero due. Each statement snapshots its deduction;
credits are not automatically carried over or applied again to another month.

### OTP-protected billing deletion

Billing history offers **Delete** for a single statement and checkboxes plus
**Delete Selected** for multiple statements on the current page. **Send Deletion
Code** emails a six-digit OTP from and to **billing@zerooneitinc.com** using the
existing Microsoft Graph credentials. Enter the code, then **Confirm Delete**.
The OTP expires after ten minutes, permits five attempts, and is bound to the
requesting administrator, exact selection, and statement versions. Resends have
a 60-second cooldown. A changed statement requires a new code. Bulk deletion is
atomic; a failure leaves all selected statements intact. Deletion permanently
removes the statements and disables public PDF links; previously emailed or
downloaded copies remain. Run the migration before deploying this feature.
Test with `RUN_BILLING_DB_TESTS=true node --test apps/api/src/utils/billing-deletion.integration.test.js`;
this uses temporary records and mocked email delivery.

### Client status and directory

Use **Clients → Add Client** to register clients. **Clients → Client Records**
is the search and review workspace, with no Add Client button. It defaults to
Active clients; switch the status filter to Inactive or All clients as needed.
Search remains available while viewing a profile. The directory and each profile
show an explicit status, and **Deactivate Client / Reactivate Client** updates it.
Client activity is maintained separately from quotation acceptance or contract
signing. Existing clients and new clients default to Active; new clients can also
be registered as Inactive. Status is scoped to the client's payment type and does
not change quotations, contracts, billing statements, or user access. Run the
migration before deploying to add `clients.is_active`.
