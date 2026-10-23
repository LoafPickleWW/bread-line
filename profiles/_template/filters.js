// This profile's filters: which titles count, what's off-limits, and what scoring should see.
// Any export here overrides the engine default of the same name in src/config.js, so delete what you don't need.
// Patterns are case-insensitive regexes tested against the job title (and sometimes the posting text).

// Role types. A job is tagged with the first category whose title pattern matches, so put the most specific first.
// `needsContext`: the title alone is too broad, so either the title or the description must also hit.
// `chip`: a shorter label for the tracker page's filter chips (defaults to `label`).
export const ROLE_CATEGORIES = [
  {
    key: 'growth',
    label: 'Growth',
    title: /\b(growth|lifecycle|retention|user acquisition)\b.{0,25}\b(lead|manager|marketing|marketer|director|head)\b/i,
  },
  {
    key: 'product',
    label: 'Product',
    title: /\b(product manager|product lead|head of product|director,? (of )?product)\b/i,
    // Only PM roles in the domains you care about.
    needsContext: {
      title: /consumer|growth|payments|fintech/i,
      description: /consumer app|daily active|retention/i,
    },
  },
];

// Companies, titles or posting text you never want to see. `label` is the drop reason in run logs.
// Leave a field null to skip that check.
export const OFF_LIMITS = {
  label: 'off-limits',
  companies: null, // e.g. /^(acme|globex)\b/i
  title: null, // e.g. /\b(trading|sales)\b/i
  text: null, // e.g. /\b(gambling|casino)\b/i
};

// Seniority: drop these titles. The default drops junior, intern and new-grad roles.
// export const DROP_TITLE = /\b(junior|jr\.?|intern(ship)?|entry[- ]level|apprentice|graduate|new grad)\b/i;

// Titles that match a category keyword but aren't the job you want.
export const EXCLUDE_TITLE = /\b(software|data|ml|security|platform) engineer|\bengineering manager|\b(account executive|sdr|bdr|sales|recruiter)\b/i;

// Posting lines worth keeping in the scoring digest: requirements, plus words that signal your domain.
// export const DIGEST_SIGNAL = /\b(\d+\+?\s*(years|yrs)|required|must|qualifications|consumer|payments)\b/i;

// Location. The defaults keep remote roles open to the US. Override US_OK to target another region.
// export const US_OK = /\b(uk|united kingdom|europe|emea|london)\b/i;
