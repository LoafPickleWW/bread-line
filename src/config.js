// Engine defaults, overridden by the active profile's filters.js (any export with the same name wins).
import { profile, profileDir } from './profile.js';

const custom = await import(new URL('filters.js', profileDir));

const defaults = {
  // Role types. A job is tagged with the first category whose title pattern matches.
  // `needsContext`: the title alone is too broad, so either the title or the description must also hit.
  // Every profile defines its own; there's no sensible default.
  ROLE_CATEGORIES: [],

  // Nothing is off-limits unless the profile says so. A job is dropped when the company, title or text matches.
  OFF_LIMITS: { label: 'off-limits', companies: null, title: null, text: null },

  // Seniority: drop these titles.
  DROP_TITLE: /\b(junior|jr\.?|intern(ship)?|entry[- ]level|apprentice|graduate|new grad|working student)\b/i,

  // Titles that match a category keyword but aren't the job you want.
  EXCLUDE_TITLE: /(?!)/,

  // Posting lines worth keeping in the scoring digest.
  DIGEST_SIGNAL:
    /\b(\d+\+?\s*(years|yrs)|experience (in|with)|required|must|you have|you bring|qualifications|ideal candidate|background in|degree|b2b|b2c|enterprise|consumer|quota|travel|on[- ]?site|hybrid|in[- ]office|relocat|location|time ?zone|reports? to|team of|manage (a|the) team|people manager)\b/i,

  // ---- Location ----
  // Remote signals in location/workplace.
  REMOTE: /\bremote\b|\banywhere\b|work from home|\bwfh\b|distributed|worldwide|\bglobal\b/i,
  // On-site / hybrid signals.
  NOT_REMOTE: /\b(on[- ]?site|onsite|hybrid|in[- ]office)\b/i,
  // The posting is open to the US. Remote roles that don't match this and name some other place are dropped.
  US_OK:
    /\b(us|u\.s\.?|usa|united states|north america|namer|americas|amer|anywhere|worldwide|global|us[- ]based)\b|\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b|\b(nyc|sf|san francisco|bay area|seattle|austin|boston|chicago|denver|los angeles|miami|atlanta)\b|,\s?(ca|ny|nj|tx|wa|ma|co|il|fl|ga|or|pa|nc|va|dc)\b|\b(eastern|est|et|pst|pt|central) (time|hours)\b/i,
};

const c = { ...defaults, ...custom };

export const { ROLE_CATEGORIES, OFF_LIMITS, DROP_TITLE, EXCLUDE_TITLE, DIGEST_SIGNAL, REMOTE, NOT_REMOTE, US_OK } = c;
// Hide roles whose posted top of range is below this; unposted pay is kept. 0 turns it off.
export const SALARY_FLOOR_USD = profile.salaryFloorUsd ?? 0;
