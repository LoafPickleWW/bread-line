// Aggregator feeds: Remotive, Remote OK, CryptoJobsList, Hacker News "Who's Hiring".
// Each returns normalized jobs with the same shape as the ATS feeds.
import { getJson, getText, htmlToText, decodeEntities } from '../http.js';
import { linkedin } from './linkedin.js';
import { profile } from '../profile.js';

export async function remotive() {
  // Remotive asks for at most a few calls a day, so keep the category list short.
  const cats = profile.remotiveCategories ?? ['marketing', 'product'];
  const lists = await Promise.all(cats.map((c) => getJson(`https://remotive.com/api/remote-jobs?category=${c}`)));
  return lists.flatMap((l) => l.jobs).map((j) => ({
    id: `remotive:${j.id}`,
    sourceId: String(j.id),
    source: 'remotive',
    company: j.company_name.trim(),
    companyCategory: null,
    title: j.title,
    location: `Remote - ${j.candidate_required_location}`,
    workplace: 'remote',
    url: j.url,
    postedAt: j.publication_date,
    salary: j.salary ? { text: j.salary } : null,
    description: htmlToText(j.description),
  }));
}

export async function remoteok() {
  const data = await getJson('https://remoteok.com/api');
  return data
    .filter((j) => j.id && j.position)
    .map((j) => ({
      id: `remoteok:${j.id}`,
      sourceId: String(j.id),
      source: 'remoteok',
      company: j.company,
      companyCategory: null,
      title: decodeEntities(j.position),
      location: `Remote - ${j.location || 'unspecified'}`,
      workplace: 'remote',
      url: j.url,
      postedAt: j.date,
      salary: j.salary_max ? { min: j.salary_min, max: j.salary_max, currency: 'USD', interval: 'year' } : null,
      description: htmlToText(j.description),
    }));
}

export async function cryptojobslist() {
  const xml = await getText('https://cryptojobslist.com/rss');
  const tag = (s, t) => {
    const m = s.match(new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`));
    return m ? m[1].trim() : '';
  };
  return xml
    .split('<item>')
    .slice(1)
    .map((item) => {
      const url = tag(item, 'link');
      const slug = url.split('/').pop();
      return {
        id: `cryptojobslist:${slug}`,
        sourceId: slug,
        source: 'cryptojobslist',
        company: tag(item, 'dc:creator'),
        companyCategory: 'crypto',
        // Titles carry the location in parens, e.g. "Growth Lead (Remote / Europe)".
        title: tag(item, 'title').replace(/\s*\([^)]*\)\s*$/, ''),
        location: tag(item, 'media:location') || tag(item, 'title').match(/\(([^)]*)\)\s*$/)?.[1] || '',
        workplace: '',
        url,
        postedAt: tag(item, 'pubDate') || null,
        salary: null,
        description: htmlToText(tag(item, 'description')),
      };
    });
}

// Latest monthly "Ask HN: Who is hiring?" thread; each top-level comment is one posting.
export async function hackernews() {
  const search = await getJson(
    'https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=hiring&hitsPerPage=5'
  );
  const thread = search.hits.find((h) => /who is hiring/i.test(h.title));
  if (!thread) return [];
  const tree = await getJson(`https://hn.algolia.com/api/v1/items/${thread.objectID}`);
  return tree.children
    .filter((c) => c.text)
    .map((c) => {
      const text = htmlToText(c.text);
      const header = text.split('\n')[0].slice(0, 300);
      const parts = header.split('|').map((p) => p.trim());
      return {
        id: `hn:${c.id}`,
        sourceId: String(c.id),
        source: 'hackernews',
        company: parts[0] || 'Unknown',
        companyCategory: null,
        // HN posts have no title field: the header line ("Acme | Head of Growth | REMOTE (US) | $180k") stands in.
        title: parts.slice(1).join(' | ') || header,
        location: parts.filter((p) => /remote|on-?site|hybrid|in[- ]office/i.test(p)).join(' | ') || header,
        workplace: /\bremote\b/i.test(header) ? 'remote' : '',
        url: `https://news.ycombinator.com/item?id=${c.id}`,
        postedAt: c.created_at,
        salary: null,
        description: text,
      };
    });
}

export const ALL_BOARDS = { remotive, remoteok, cryptojobslist, hackernews, linkedin };
// The ones this profile pulls (profile.json "boards"); all of them when it doesn't say.
export const BOARDS = Object.fromEntries(
  Object.entries(ALL_BOARDS).filter(([name]) => !profile.boards || profile.boards.includes(name))
);
