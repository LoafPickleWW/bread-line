// LinkedIn job alerts. LinkedIn has no public feed, so the daily run's Claude session reads the alert emails
// (profile.json "linkedin") and writes what they list to the profile's data/linkedin-inbox.json:
//
//   [{ "jobId": "4012345678", "title": "...", "company": "...", "location": "United States",
//      "remote": true, "salary": "$150K/yr - $200K/yr" | null, "emailDate": "2026-10-16" }]
//
// `remote` is true when the alert itself is a remote search (its first line reads "Your job alert for … remote in
// United States"). LinkedIn lists only the company's city in those emails, without a "(Remote)" marker.
//
// This source turns that file into normal jobs, so they get the same filters, dedupe and scoring as every
// other board. `npm run radar:commit` empties the file once the jobs are in the tracker.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dataDir } from '../profile.js';

export const INBOX = new URL('linkedin-inbox.json', dataDir);

export async function linkedin() {
  if (!existsSync(INBOX)) return [];
  const rows = JSON.parse(await readFile(INBOX, 'utf8'));
  return rows
    .filter((r) => r.jobId && r.title && r.company)
    .map((r) => {
      const id = String(r.jobId).replace(/\D/g, '');
      const location = r.location || '';
      return {
        id: `linkedin:${id}`,
        sourceId: id,
        source: 'linkedin',
        company: r.company.trim(),
        companyCategory: null,
        title: r.title.trim(),
        location,
        workplace: /\((hybrid|on-?site)\)/i.test(location) ? 'hybrid' : r.remote || /\(remote\)/i.test(location) ? 'remote' : '',
        url: `https://www.linkedin.com/jobs/view/${id}/`,
        postedAt: r.emailDate || null,
        // "/yr" sits between the number and the dash in LinkedIn's format; drop it so the range parser reads it.
        salary: r.salary ? { text: String(r.salary).replace(/\s*\/\s*(yr|year)/gi, '') } : null,
        // Alert emails carry no posting text. Paste the description into the tracker for a better cover letter.
        description: '',
      };
    });
}
