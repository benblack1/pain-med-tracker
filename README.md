# Shared Pain Medication Tracker (PWA)

A modern, glassmorphic Progressive Web App designed to track alternating pain medication (Ibuprofen and Acetaminophen). Syncs seamlessly with Google Sheets so patients and caregivers can log and view doses together in real time.

---

## 🌟 What's New in v2.0

- **Frosted Glass UI with Dark & Light Modes**: Sleek modern glassmorphism design with responsive theme toggle and glowing countdown timer.
- **Push Notifications via [ntfy.sh](https://ntfy.sh)**: Free, zero-setup background notifications sent to your phone when your next dose is ready. Easily toggle on or off in Settings.
- **Multi-User Profiles**: Bottom dock lets you instantly switch between patients (`Ben`, `Wife`, or dynamically add new people with custom presets).
- **Caregiver Logging ("Administered by")**: Track who administered each dose so you and your partner stay in sync.
- **Customizable Dosages & Schedule**: Shared settings in Google Sheets per user:
  - Custom dose per intake (e.g., 400mg vs 600mg Ibuprofen, 500mg vs 1000mg Acetaminophen).
  - Custom 24-hour maximum limits.
  - Custom interval hours (e.g., 4 hours alternating while awake).
- **Rolling 24-Hour Limits**: Calculates intake over the trailing 24 hours (safer than a strict calendar-day reset).
- **Start New Round / Archive**: Reset your active countdown and 24h totals when starting a new recovery round without deleting your past medical log history.

---

## 🚀 Setup & Upgrading Instructions

### Part 1: Update Google Apps Script
1. Open your existing Google Sheet for the tracker.
2. Go to **Extensions > Apps Script**.
3. Replace the contents of the script editor with the code in [`google-script.js`](./google-script.js).
4. Click **Deploy > Manage Deployments**.
5. Click the pencil icon (Edit), choose **Version: New Version**, and click **Deploy**.
   > *Note: If creating a brand new deployment, choose Type: Web App, Execute as: Me, Who has access: Anyone.*

### Part 2: Push Notifications (ntfy.sh)
1. In the app, tap the **Gear icon (Settings)**.
2. Toggle on **Push Notifications**.
3. Note your channel topic (e.g. `painmed-ben-4821`) or pick your own custom name.
4. On your iPhone or Android phone, install the free **ntfy** app from the App Store / Google Play (or visit `ntfy.sh/<your-topic>` in your browser) and subscribe to that topic.
5. Tap **Send Test Notification** in Settings to verify it rings!

### Part 3: Install as PWA (Add to Home Screen)
- **iPhone (iOS Safari)**: Tap the Share button (square with arrow) > scroll down and tap **Add to Home Screen**.
- **Android (Chrome)**: Tap the three dots menu > tap **Add to Home screen** (or **Install App**).

---

## 🔒 Privacy & Disclaimer
This app connects only to your personal Google Sheet and optionally to public ntfy.sh topics. It contains no tracking, cookies, or external ad analytics.

*Disclaimer: This application is a logging aid and does not provide medical advice. Always consult your healthcare provider or pharmacist regarding medication dosages and schedules.*
