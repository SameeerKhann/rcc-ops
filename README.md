# Right Choice Cleaning — Ops

A lightweight internal app for **Right Choice Cleaning** (Calgary & Edmonton). Two pages, sharp dark theme, works offline, and can sync live between **Sameer** and **Dmitry**.

## Pages

| Page | File | What it's for |
|------|------|----------------|
| **Client Follow-Ups** | `index.html` | Every serviced client gets a next-day follow-up card with 4 tasks: **Follow up · Review link sent · Recurring cleaning · Status in GHL**. Progress ring, Send-review (SMS/email), Open-GHL, notes, status. Import a day via the **Sync from Claude** button or **Add day**. |
| **Team Tasks** | `team.html` | Sameer & Dmitry assign tasks to **each other or themselves**. Priority, due date, status, filters, and a **Chrome notification** when someone assigns you a task. |

Switch pages from the top nav. Pick who you are (top-right) — this drives assignments and notifications.

## Run it

- **Quick:** open `index.html` in Chrome.
- **Recommended (enables live "Sync from Claude"):** serve the folder, e.g.
  ```bash
  python -m http.server 8790
  ```
  then open <http://localhost:8790/index.html>.
- **Hosted:** it's on GitHub Pages so Dmitry can just open the link.

Install it as an app: Chrome → address-bar install icon (or ⋮ → *Install page as app*).

## Turn on cross-device sync + notifications (once, ~3 min)

By default data is stored **on each device**. To share tasks live between Sameer & Dmitry and get Chrome notifications across computers, add a free Firebase project:

1. <https://console.firebase.google.com> → **Add project**.
2. **Build → Firestore Database → Create database → Start in test mode**.
3. **Project settings ⚙ → Your apps → Web (`</>`)** → register → copy the `firebaseConfig`.
4. Paste those 6 values into **`assets/firebase-config.js`** and commit.
5. Refresh — the top-right menu should read **"☁ Cloud sync on"**.

The Firebase web config is safe to keep in the repo. Ask Claude to add Firestore security rules before relying on it long-term.

## The screenshot → app workflow

Paste a day/week calendar screenshot into your Claude chat. Claude writes the client names into **`inbox.json`**; on the Client Follow-Ups page press **Sync from Claude** (or reload) to pull them in. Re-syncing is safe — duplicates are skipped.

## Notes

- Set your Google review link at the top of `assets/client.js` (`REVIEW_LINK`).
- Notifications only fire while the app (or an installed window) is open in Chrome.
- Back up anytime: top-right menu → **Export backup**.
