# Project Memory & Context

This file contains persistent memory for the PowerMTA/VelkoMTA Dashboard project to ensure continuity, stability, and rapid access without asking the user repeatedly for details.

## 1. Core Principles (Stability Mode)
- **Do NOT Break Existing Flows:** When making changes, ensure backward compatibility. Do not randomly modify databases to bypass verification if an admin account already exists.
- **Maintain Stability:** Any hotfix should address ONLY the bug at hand. Avoid over-engineering or adding unnecessary complexities that might break other components.
- **Always Test Manually First (If Automations Fail):** Rely on the user's manual validation if headless browsers fail due to OS restrictions.

## 2. Environment & Access Credentials

### Dashboard Admin Account:
- **Email:** `pranavpatel.mainvps@gmail.com` (Already Verified Admin)
- **Password:** `Stoneheart@24`
- *Note: Do not try to hack/bypass the sqlite database for this account. It is fully functional.*

### Default Test Server (For Deployments):
- **Server Name/IP:** `192.119.169.5`
- **Password:** `cG730t*%?2fM`
- **Additional IPs & Domains:**
  1. `192.119.169.123` -> `quicklendings.com`
  2. `192.119.169.124` -> `tommorrow-loan.com`

## 3. Known Architecture Notes
- The backend runs on Flask (`backend.py` / `live_backend.py`).
- The frontend is a React app currently using Vite/Tailwind/Framer-Motion.
- Changes to the frontend MUST be built via CMD `npm run build` and copied to `static/` because PowerShell execution policies blocks `npm.ps1` natively inside the AI shell.
- Roundcube is standardized to launch on Port `8000`.

*(Keep appending to this file as new servers or rules are introduced by the user)*
