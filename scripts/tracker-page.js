// Copy the tracker page into the profile for publishing: `npm run tracker:page -- --profile <name>`
// Writes profiles/<name>/tracker.html from the installed Bread Line version. Publish that copy as the person's own
// claude.ai page, and run this again before republishing to pick up a newer tracker design.
import { copyFile } from 'node:fs/promises';
import { PKG, profileDir, PROFILE_REL } from '../src/profile.js';

await copyFile(new URL('tracker/index.html', PKG), new URL('tracker.html', profileDir));
console.log(`Wrote ${PROFILE_REL}tracker.html`);
