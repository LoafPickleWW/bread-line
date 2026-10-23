// Greenhouse, Lever and Ashby public job-board feeds. No login, no keys.
import { getJson, htmlToText } from '../http.js';

const ATS = {
  greenhouse: {
    url: (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
    list: (data) => data.jobs,
    normalize: (j, co) => ({
      sourceId: String(j.id),
      title: j.title,
      location: j.location?.name ?? '',
      workplace: '',
      url: j.absolute_url,
      postedAt: j.first_published ?? j.updated_at,
      salary: null,
      description: htmlToText(j.content),
    }),
  },
  lever: {
    url: (slug) => `https://api.lever.co/v0/postings/${slug}?mode=json`,
    list: (data) => data,
    normalize: (j) => ({
      sourceId: j.id,
      title: j.text,
      location: [j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean).join(' / '),
      workplace: j.workplaceType ?? '',
      url: j.hostedUrl,
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
      salary: j.salaryRange
        ? { min: j.salaryRange.min, max: j.salaryRange.max, currency: j.salaryRange.currency, interval: j.salaryRange.interval }
        : null,
      description: [j.descriptionPlain, ...(j.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`), j.additionalPlain]
        .filter(Boolean)
        .join('\n'),
    }),
  },
  ashby: {
    url: (slug) => `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`,
    list: (data) => data.jobs,
    normalize: (j) => ({
      sourceId: j.id,
      title: j.title,
      location: [
        ...new Set(
          [j.location, ...(j.secondaryLocations ?? []).map((l) => l.location), j.address?.postalAddress?.addressCountry].filter(
            Boolean
          )
        ),
      ].join(' / '),
      // Ashby sets isRemote on hybrid roles too, so workplaceType wins when present.
      workplace: (j.workplaceType ?? (j.isRemote ? 'remote' : '')).toLowerCase(),
      url: j.jobUrl,
      postedAt: j.publishedAt,
      salary: ashbySalary(j.compensation),
      description: j.descriptionPlain ?? htmlToText(j.descriptionHtml),
    }),
  },
};

function ashbySalary(comp) {
  const c = comp?.summaryComponents?.find((s) => s.compensationType === 'Salary');
  if (!c || (c.minValue == null && c.maxValue == null)) return null;
  return { min: c.minValue, max: c.maxValue, currency: c.currencyCode, interval: c.interval };
}

export const ATS_NAMES = Object.keys(ATS);

// Returns job count if the board exists, else null.
export async function probe(ats, slug) {
  try {
    const data = await getJson(ATS[ats].url(slug), { timeoutMs: 15000 });
    const list = ATS[ats].list(data);
    return Array.isArray(list) ? list.length : null;
  } catch {
    return null;
  }
}

export async function fetchBoard(company) {
  const a = ATS[company.ats];
  const data = await getJson(a.url(company.slug));
  return a.list(data).map((j) => {
    const job = a.normalize(j);
    return {
      ...job,
      id: `${company.ats}:${company.slug}:${job.sourceId}`,
      source: company.ats,
      company: company.name,
      companyCategory: company.category,
    };
  });
}
