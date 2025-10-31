# Maintenance Notes

The TRUE Framework web app is a static HTML/CSS/JS site. There is no build pipeline; the deployed demo at https://csheargm.github.io/true_framework/ serves these files directly.

## Local Development
- Open `index.html` in a modern browser to run the app offline.
- Optional integrations (Google Forms, Firebase) require updating `firebase-config.js` or the form configuration described in the upstream README.

## Updating the Demo Snapshot
After syncing upstream changes, copy the updated static assets (`index.html`, `app.js`, `styles.css`, `modal-update.js`, `model-evaluations.js`, and `firebase-config.js`) into both `resources/demos/true-framework-site/` and `docs/true-framework-demo/`.  
This keeps the checked-in reference bundle and the GitHub Pages mirror aligned.

## Testing Changes
- Exercise the interactive scoring flow locally, especially auto-analysis and Google Form submission if configured.
- Run browser console checks for JavaScript errors before publishing updates.
