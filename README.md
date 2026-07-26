# 🛡️ SecureMart – Full-Stack Cybersecurity Training E-Commerce Platform

SecureMart is a production-grade multi-vendor e-commerce web application built specifically for **cybersecurity education, SOC training, ethical hacking, and threat hunting** in a single unified project repository.

---

## 🌟 Architecture (Unified Single-Folder Project)

SecureMart runs as a **single full-stack application** on `http://localhost:3000`:

```
Stopre/
├── package.json              # Unified dependencies for Next.js 14, Express, & Threat Engine
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # Dark-mode glassmorphic Tailwind CSS config
├── postcss.config.js         # PostCSS config
├── next.config.js            # Next.js App Router configuration
├── .env                      # Unified environment variables
├── server.ts                 # Unified Express + Next.js + WebSocket entry point
├── start.bat                 # 1-Click launcher (npm)
├── README.md                 # Project documentation
│
└── src/
    ├── app/                  # Next.js App Router (Frontend Pages)
    │   ├── page.tsx          # Home Page with Hero Carousel & SOC Banner
    │   ├── globals.css       # Global Glassmorphic Styles
    │   ├── layout.tsx        # Root App Layout & Toast Provider
    │   ├── admin/            # Admin Portal (User Ban, Seller Approval, Revenue)
    │   ├── auth/login/       # Multi-mode Auth (Login / Register / Reset)
    │   ├── dashboard/        # Customer Dashboard (Orders, Notifications)
    │   ├── products/         # Product Listing & Detail Pages
    │   └── soc/              # SOC Dashboard & Threat Intelligence Feed
    │
    └── server/               # Integrated Backend & Security Engine
        ├── config/           # Database pool (Supabase) & env config
        ├── controllers/      # Auth, Product, Cart, Order, SOC, Admin controllers
        ├── database/         # PostgreSQL schema.sql
        ├── middleware/       # Threat Engine, GeoIP Logger, Auth, Rate Limiters
        ├── routes/           # REST API routes (/api/*)
        └── scripts/          # Database seeder (seed.ts)
```

---

## 🚀 Quick Start Guide (using npm)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database (Supabase)
1. Log into your [Supabase Console](https://supabase.com/).
2. Open **SQL Editor** and run the contents of `src/server/database/schema.sql`.
3. Copy your PostgreSQL connection string from **Project Settings > Database > Connection URI**.
4. Open `.env` in the root folder and paste your URI into `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

### 3. Seed Database
Run the seed script to populate default categories, test user accounts across all 9 roles, sample products, and coupon codes:
```bash
npm run seed
```

### 4. Start the Application
Double-click `start.bat` or run:
```bash
npm run dev
```

* **Application URL**: [http://localhost:3000](http://localhost:3000)
* **SOC Dashboard**: [http://localhost:3000/soc](http://localhost:3000/soc)
* **Admin Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)
* **Backend REST API**: [http://localhost:3000/api](http://localhost:3000/api)
* **SOC Live WebSocket**: `ws://localhost:3000/ws/soc`

---

## 🔑 Test Credentials (All Passwords: `SecureMart@123`)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@securemart.local` | `SecureMart@123` |
| **Admin** | `admin@securemart.local` | `SecureMart@123` |
| **SOC Analyst** | `soc@securemart.local` | `SecureMart@123` |
| **Customer** | `customer@securemart.local` | `SecureMart@123` |
| **Seller** | `seller@securemart.local` | `SecureMart@123` |
| **Delivery Partner** | `delivery@securemart.local` | `SecureMart@123` |
| **Warehouse Staff** | `warehouse@securemart.local` | `SecureMart@123` |
| **Pharmacy Manager** | `pharmacy@securemart.local` | `SecureMart@123` |

---

## 🎯 SOC Pentesting Practice Commands

Run these security tools against your local SecureMart instance to test SOC alert generation:

### 1. SQLMap (SQL Injection Testing)
```bash
sqlmap -u "http://localhost:3000/api/products?search=test" --batch --dbs
```

### 2. Gobuster (Directory Enumeration)
```bash
gobuster dir -u http://localhost:3000/ -w /usr/share/wordlists/dirb/common.txt
```

### 3. Hydra (Brute Force Login)
```bash
hydra -l customer@securemart.local -P passlist.txt localhost http-post-form "/api/auth/login:{\"email\":\"^USER^\",\"password\":\"^PASS^\"}:F=Invalid credentials"
```

### 4. Nmap (Port Scanning & Service Detection)
```bash
nmap -sV -sC -p 3000 localhost
```

---

> ⚠️ **Educational Disclaimer**: SecureMart is intended solely for local cybersecurity training, SOC analysis, and vulnerability research in controlled lab environments.
