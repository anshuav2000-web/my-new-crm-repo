# 🚀 Canvas Cartel CRM - Deployment Guide for Hostinger VPS with Coolify

This folder contains all the configuration files and step-by-step instructions required to deploy the **Canvas Cartel CRM** onto your Hostinger VPS using **Coolify**.

---

## 📁 Deployment Directory Structure
- `deployment/Dockerfile` - Optimised multi-stage Docker build for both Vite and Express.
- `deployment/docker-compose.yml` - Docker compose file orchestration of both the CRM application and the Postgres database.
- `deployment/README.md` - This step-by-step deployment guide.

---

## 🛠️ Step 1: Hostinger VPS Setup
1. Log in to your **Hostinger Members Area**.
2. Navigate to **VPS** -> Select your server.
3. In the VPS operating system settings, choose to reinstall your server with **Ubuntu 22.04 LTS (Clean OS)**.
4. Copy your **Server IP Address** and **SSH Root Password**.

---

## 🔮 Step 2: Install Coolify on your VPS
1. Open your terminal (or PowerShell) and connect to your Hostinger VPS via SSH:
   ```bash
   ssh root@your_vps_ip_address
   ```
2. Run the official Coolify installation script:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
3. Once the installation is complete, you will see a success message with the URL to access your Coolify panel:
   `http://your_vps_ip_address:8000`
4. Open the link in your web browser, register your admin account, and complete the initial setup.

---

## 📦 Step 3: Deploy CRM on Coolify

### Option A: Deploy using Docker Compose (Recommended - Zero Config)
1. Inside the Coolify Dashboard, click **Projects** -> **Create New Project**.
2. Choose **Production** env, then click **New Resource** -> **Docker Compose**.
3. Copy the contents of `deployment/docker-compose.yml` and paste it into the Coolify Compose text area.
4. Coolify will automatically detect the services: `app` and `postgres`.
5. Under the `app` service settings:
   - Configure your **Domain** (e.g., `https://crm.canvascartel.in`). Coolify automatically provisions free Let's Encrypt SSL!
   - Change `DATABASE_URL` and `SESSION_SECRET` in the Environment section to your secure production values.

### Option B: Deploy App and DB separately (For Scale)
1. **Create PostgreSQL Database in Coolify**:
   - Click **New Resource** -> **Databases** -> **PostgreSQL**.
   - Note down the generated connection string (`DATABASE_URL`).
2. **Create Application Resource**:
   - Click **New Resource** -> **Git Repository** (GitHub / GitLab / manual git URL).
   - Point it to your Canvas Cartel Connect repository.
   - For **Build Pack**, select **Dockerfile**.
   - Change the Dockerfile path in settings to: `deployment/Dockerfile`.
   - Add the following Environment Variables in the app configuration:
     - `DATABASE_URL` = (Your Coolify Postgres connection string)
     - `SESSION_SECRET` = (A secure random 32-character string)
     - `PORT` = `5000`
     - `NODE_ENV` = `production`
   - Set the domain mapping in Coolify (e.g., `https://crm.canvascartel.in`).

---

## 🔑 Required Environment Variables
Ensure these environment variables are fully set in Coolify before clicking deploy:

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Complete connection string to Postgres DB | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET`| Secure key used to sign Express cookies | `32_character_long_secret_key` |
| `NODE_ENV` | Mode of operation | `production` |
| `PORT` | Inside container port | `5000` |
| `REPL_ID` | Session and unique identifier | `canvas_cartel_prod` |

---

## ⚙️ Step 4: Running Database Migrations
Coolify handles running migrations automatically through the container build process, but you can trigger a manual schema push using Drizzle:
1. Inside the Coolify panel, open your **App service** -> click on the **Terminal** tab.
2. Select the container and run:
   ```bash
   npm run db:push
   ```
This will instantly configure and sync the Postgres tables with your latest schema (including the newly added access roles & employee permissions fields!).

---

## 🎉 Live Syncing and Port Settings
- The CRM automatically operates WebSockets on the same port (`5000`) under the `/ws` path.
- Coolify's reverse proxy (Nginx / Traefik) automatically supports WebSocket upgrades out-of-the-box, ensuring real-time syncing works seamlessly without any custom proxy configuration!
