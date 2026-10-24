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
