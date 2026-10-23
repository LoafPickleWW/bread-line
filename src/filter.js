import { ROLE_CATEGORIES, DROP_TITLE, EXCLUDE_TITLE, REMOTE, NOT_REMOTE, US_OK, SALARY_FLOOR_USD, OFF_LIMITS } from './config.js';

// The profile's off-limits topics: the company, the title, or the posting text.
export function offLimits(job) {
  const { companies, title, text } = OFF_LIMITS;
  return !!(companies?.test(job.company.trim()) || title?.test(job.title) || text?.test(`${job.title}\n${job.description}`));
}

// Each check returns null to keep the job, or a short reason it was dropped.

export function roleCategory(job) {
  const title = job.title;
  if (job.source !== 'hackernews' && EXCLUDE_TITLE.test(title)) return null;
  for (const c of ROLE_CATEGORIES) {
    if (!c.title.test(title)) continue;
    // LinkedIn alerts are already your own searches and carry no description, so they skip the context check.
    if (c.needsContext && job.source !== 'linkedin' && !c.needsContext.title.test(title) && !c.needsContext.description.test(job.description)) continue;
    return c.key;
  }
  return null;
}

export function locationVerdict(job) {
  const loc = job.location;
  // "Remote or Hybrid - NYC" is fine; drop only when hybrid/on-site and no remote option is stated.
  if ((NOT_REMOTE.test(job.workplace) || NOT_REMOTE.test(loc)) && !REMOTE.test(loc)) return 'hybrid/on-site';
  if (job.workplace !== 'remote' && !REMOTE.test(loc)) return 'not remote';
  if (US_OK.test(loc)) return null;
  // Whatever's left after the remote words. Bare "Remote" is kept (scoring flags it if the description says otherwise);
  // "Remote - Canada", "Remote (UK)", "Remote - Seoul" are not.
  const leftover = loc
    .replace(new RegExp(REMOTE.source, 'gi'), ' ')
    .replace(/\b(unspecified|fully|full[- ]time|friendly|first|only|role|position|ok|option)\b/gi, ' ')
    .replace(/[^a-z]+/gi, ' ')
    .trim();
  return leftover ? 'remote outside US' : null;
}

// Best-effort annual USD pay range { min, max }, from the feed's own fields or else the posting text
// ("$186,065—$218,900 USD", "$150K - $200K", "$140k to $160k", "$50/hr"). Null when no pay is posted.
export function salaryRange(job) {
  const s = job.salary;
  if (s?.max && (!s.currency || s.currency === 'USD')) return { min: annualize(s.min, s.interval) || null, max: annualize(s.max, s.interval) };
  const text = `${s?.text ?? ''}\n${job.description}`;
  const m = text.match(
    /\$\s?(\d{2,3}(?:[,.]\d{3})*(?:\.\d+)?)\s?(k|K)?\s*(?:-|–|—|to)\s*(?:USD\s*)?\$?\s?(\d{2,3}(?:[,.]\d{3})*(?:\.\d+)?)\s?(k|K)?/
  );
  if (!m) {
    const hourly = text.match(/\$\s?(\d{2,3})(?:\.\d+)?\s*(?:\/|per\s*)\s*(?:hr|hour)\b/i);
    return hourly ? { min: null, max: Number(hourly[1]) * 2080 } : null;
  }
  const num = (v) => parseFloat(v.replace(/[,.](?=\d{3})/g, ''));
  let min = num(m[1]);
  let max = num(m[3]);
  if (m[4] || m[2]) max *= 1000;
  if (m[2] || (m[4] && min < 1000)) min *= 1000; // "$150-200K" puts the K only on the top
  if (max < 20000 || min > max) return null; // hourly rates, page counts and other noise
  return { min, max };
}

export const salaryMaxUsd = (job) => salaryRange(job)?.max ?? null;

export function formatSalary(range) {
  if (!range?.max) return null;
  const k = (n) => `$${Math.round(n / 1000)}k`;
  return range.min ? `${k(range.min)}–${k(range.max)}` : `up to ${k(range.max)}`;
}

function annualize(n, interval = '') {
  if (n == null) return null;
  if (/hour/i.test(interval)) return n * 2080;
  if (/month/i.test(interval)) return n * 12;
  return n;
}

export function evaluate(job) {
  if (DROP_TITLE.test(job.title)) return { keep: false, reason: 'junior/intern' };
  if (offLimits(job)) return { keep: false, reason: OFF_LIMITS.label };
  const category = roleCategory(job);
  if (!category) return { keep: false, reason: 'role not a match' };
  const loc = locationVerdict(job);
  if (loc) return { keep: false, reason: loc, category };
  const salaryMax = salaryMaxUsd(job);
  if (salaryMax != null && salaryMax < SALARY_FLOOR_USD) return { keep: false, reason: 'pay below floor', category };
  return { keep: true, category, salaryMax };
}
