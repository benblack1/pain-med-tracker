# Shared Pain Medication Tracker
A simple, mobile-friendly web application to track medication rotation (Ibuprofen vs. Acetaminophen) for pain management. It features large buttons for easy use with injured hands and syncs data to a Google Sheet so multiple people (patients and caregivers) can view and log doses in real-time.

## Features
Smart Rotation: Automatically suggests the next medication based on a 3-hour alternating schedule.

Cloud Sync: Uses Google Sheets as a backend, allowing iPhone (iOS) and Android users to see the same data instantly.

Large Interface: Designed with massive hit targets for accessibility.

Undo Function: Quickly remove accidental entries.

Add to Home Screen: Functions like a native app when added to the home screen (PWA).

## Setup Instructions
Part 1: The Database (Google Sheets)
Create a new Google Sheet.

Go to Extensions > Apps Script.

Paste the Google Apps Script code (found in google-script.js or the project documentation).

Click Deploy > New Deployment.

* Type: Web App

* Execute as: Me

* Who has access: Anyone (Required for the app to talk to the sheet)

Copy the Web App URL (ends in /exec).

Part 2: The App (GitHub Pages)
Open index.html in this repository.

Find the line: const SCRIPT_URL = 'PASTE_YOUR_URL_HERE';

Paste your Google Web App URL inside the quotes.

Commit the changes.

Go to Settings > Pages and enable GitHub Pages on the main branch.

## How to Install (Add to Home Screen)
iPhone (iOS)
Open the website in Safari.

Tap the Share icon (box with an arrow pointing up).

Scroll down and tap Add to Home Screen.

Android
Open the website in Chrome.

Tap the three dots (menu) in the top right.

Tap Add to Home screen.

## Disclaimer
This application is a simple logging tool and does not constitute medical advice. Always follow the dosage instructions provided by your doctor or pharmacist.
