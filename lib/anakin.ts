import axios from 'axios';
import type { RedditSignals, RedditPost, YouTubeSignals, YouTubeVideo } from './types';

export type ScrapedPage = {
  url: string;
  markdown: string;
  metadata?: { title?: string; description?: string };
};

const ANAKIN_BASE = 'https://api.anakin.io/v1/url-scraper';
const POLL_INTERVAL_MS = 2500;
const PER_REQUEST_TIMEOUT_MS = 10000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeUrl(
  url: string,
  opts?: { timeoutMs?: number }
): Promise<ScrapedPage | null> {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) {
    console.warn('[anakin] missing ANAKIN_API_KEY');
    return null;
  }

  const headers = {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  };

  const totalTimeout = opts?.timeoutMs ?? 25000;
  const deadline = Date.now() + totalTimeout;

  let jobId: string | undefined;
  try {
    const startRes = await axios.post(
      ANAKIN_BASE,
      { url, useBrowser: true, formats: ['markdown'] },
      { headers, timeout: PER_REQUEST_TIMEOUT_MS }
    );
    const startData = startRes.data as { jobId?: unknown } | undefined;
    if (!startData || typeof startData.jobId !== 'string') {
      console.warn('[anakin] missing jobId in scrape start response');
      return null;
    }
    jobId = startData.jobId;
  } catch (err) {
    console.warn('[anakin] start request failed:', (err as Error).message);
    return null;
  }

  // Poll loop
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    if (Date.now() >= deadline) break;

    try {
      const pollRes = await axios.get(`${ANAKIN_BASE}/${jobId}`, {
        headers,
        timeout: PER_REQUEST_TIMEOUT_MS,
      });
      const pollData = pollRes.data as
        | {
            status?: string;
            data?: {
              url?: string;
              markdown?: string;
              metadata?: { title?: string; description?: string };
            };
          }
        | undefined;

      const status = pollData?.status;
      if (status === 'completed') {
        const inner = pollData?.data;
        if (!inner || typeof inner.markdown !== 'string') {
          console.warn('[anakin] completed but missing markdown payload');
          return null;
        }
        return {
          url: typeof inner.url === 'string' ? inner.url : url,
          markdown: inner.markdown,
          metadata: inner.metadata,
        };
      }
      if (status === 'failed') {
        console.warn('[anakin] job failed', jobId);
        return null;
      }
      // pending | processing → continue polling
    } catch (err) {
      console.warn('[anakin] poll request failed:', (err as Error).message);
      return null;
    }
  }

  console.warn('[anakin] scrape timed out after', totalTimeout, 'ms', 'jobId:', jobId);
  return null;
}

// ---------------------------------------------------------------------------
// Phase 2 additions: crawl, agentic-search, search-citations
// ---------------------------------------------------------------------------

const ANAKIN_API_BASE = 'https://api.anakin.io/v1';

export type CrawlPage = { url: string; markdown: string };
export type CrawlResult = { url: string; pages: CrawlPage[] };

function authHeaders(apiKey: string): { 'X-API-Key': string; 'Content-Type': string } {
  return {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  };
}

async function pollJob<T>(
  getUrl: string,
  intervalMs: number,
  deadline: number,
  headers: Record<string, string>
): Promise<T | null> {
  while (Date.now() < deadline) {
    await sleep(intervalMs);
    if (Date.now() >= deadline) break;
    try {
      const res = await axios.get(getUrl, { headers, timeout: PER_REQUEST_TIMEOUT_MS });
      const data = res.data as { status?: string } | undefined;
      const status = data?.status;
      if (status === 'completed') {
        return data as T;
      }
      if (status === 'failed') {
        return null;
      }
      // pending | processing | running → continue polling
    } catch (err) {
      console.warn('[anakin/poll]', (err as Error).message);
      return null;
    }
  }
  return null;
}

export async function crawlSite(
  url: string,
  opts?: { maxPages?: number; includePatterns?: string[]; timeoutMs?: number }
): Promise<CrawlResult | null> {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) {
    console.warn('[anakin/crawl] missing ANAKIN_API_KEY');
    return null;
  }

  const headers = authHeaders(apiKey);
  const totalTimeout = opts?.timeoutMs ?? 35000;
  const deadline = Date.now() + totalTimeout;

  const body = {
    url,
    maxPages: opts?.maxPages ?? 8,
    includePatterns: opts?.includePatterns ?? ['*pricing*', '*plans*', '*features*', '*product*'],
    useBrowser: true,
    country: 'us',
  };

  let jobId: string | undefined;
  try {
    const startRes = await axios.post(`${ANAKIN_API_BASE}/crawl`, body, {
      headers,
      timeout: PER_REQUEST_TIMEOUT_MS,
    });
    const startData = startRes.data as { jobId?: unknown } | undefined;
    if (!startData || typeof startData.jobId !== 'string') {
      console.warn('[anakin/crawl] missing jobId in start response');
      return null;
    }
    jobId = startData.jobId;
  } catch (err) {
    console.warn('[anakin/crawl]', (err as Error).message);
    return null;
  }

  const completed = await pollJob<{
    status?: string;
    url?: string;
    results?: Array<{
      url?: string;
      status?: string;
      markdown?: string;
      html?: string;
      error?: string;
    }>;
  }>(`${ANAKIN_API_BASE}/crawl/${jobId}`, 3000, deadline, headers);

  if (!completed) {
    console.warn('[anakin/crawl] timed out or failed', 'jobId:', jobId);
    return null;
  }

  const resultsRaw = Array.isArray(completed.results) ? completed.results : [];
  const pages: CrawlPage[] = resultsRaw
    .filter(
      (r): r is { url: string; status: string; markdown: string } =>
        !!r &&
        typeof r === 'object' &&
        r.status === 'completed' &&
        typeof r.markdown === 'string' &&
        r.markdown.trim().length > 0 &&
        typeof r.url === 'string'
    )
    .map((r) => ({ url: r.url, markdown: r.markdown }));

  return { url: typeof completed.url === 'string' ? completed.url : url, pages };
}

export async function agenticSearch(
  prompt: string,
  opts?: { timeoutMs?: number }
): Promise<unknown | null> {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) {
    console.warn('[anakin/agentic-search] missing ANAKIN_API_KEY');
    return null;
  }

  const headers = authHeaders(apiKey);
  const totalTimeout = opts?.timeoutMs ?? 90000;
  const deadline = Date.now() + totalTimeout;

  let jobId: string | undefined;
  try {
    const startRes = await axios.post(
      `${ANAKIN_API_BASE}/agentic-search`,
      { prompt },
      { headers, timeout: PER_REQUEST_TIMEOUT_MS }
    );
    const startData = startRes.data as { job_id?: unknown } | undefined;
    if (!startData || typeof startData.job_id !== 'string') {
      console.warn('[anakin/agentic-search] missing job_id in start response');
      return null;
    }
    jobId = startData.job_id;
  } catch (err) {
    console.warn('[anakin/agentic-search]', (err as Error).message);
    return null;
  }

  const completed = await pollJob<{ status?: string; generatedJson?: unknown }>(
    `${ANAKIN_API_BASE}/agentic-search/${jobId}`,
    10000,
    deadline,
    headers
  );

  if (!completed) {
    console.warn('[anakin/agentic-search] timed out or failed', 'jobId:', jobId);
    return null;
  }

  return completed.generatedJson ?? null;
}

export async function searchCitations(
  query: string
): Promise<{ snippets: { title: string; url: string; snippet: string }[] } | null> {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) {
    console.warn('[anakin/search] missing ANAKIN_API_KEY');
    return null;
  }

  const headers = authHeaders(apiKey);

  try {
    const res = await axios.post(
      `${ANAKIN_API_BASE}/search`,
      { prompt: query },
      { headers, timeout: 15000 }
    );
    const data = res.data as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') {
      return { snippets: [] };
    }

    let arr: unknown[] | null = null;
    for (const key of ['results', 'citations', 'snippets']) {
      const candidate = (data as Record<string, unknown>)[key];
      if (Array.isArray(candidate)) {
        arr = candidate;
        break;
      }
    }

    if (!arr) return { snippets: [] };

    const snippets = arr
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .map((x) => {
        const title = typeof x.title === 'string' ? x.title : '';
        const url =
          typeof x.url === 'string'
            ? x.url
            : typeof x.link === 'string'
              ? x.link
              : '';
        const snippet =
          typeof x.snippet === 'string'
            ? x.snippet
            : typeof x.description === 'string'
              ? x.description
              : typeof x.text === 'string'
                ? x.text
                : '';
        return { title, url, snippet };
      })
      .filter((s) => s.url);

    return { snippets };
  } catch (err) {
    console.warn('[anakin/search]', (err as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase 3 additions: generic Wire/Holocron task helper + Google Trends
// ---------------------------------------------------------------------------

export type WireTaskResult = unknown; // Caller validates shape

export async function wireTask(
  actionId: string,
  params: Record<string, unknown>,
  opts?: { credentialId?: string; timeoutMs?: number; pollIntervalMs?: number }
): Promise<WireTaskResult | null> {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) {
    console.warn('[anakin/wire] missing ANAKIN_API_KEY');
    return null;
  }

  const headers = authHeaders(apiKey);
  const totalTimeout = opts?.timeoutMs ?? 30000;
  const pollIntervalMs = opts?.pollIntervalMs ?? 3000;
  const deadline = Date.now() + totalTimeout;

  const body: Record<string, unknown> = {
    action_id: actionId,
    params,
  };
  if (opts?.credentialId) body.credential_id = opts.credentialId;

  let jobId: string | undefined;
  try {
    const startRes = await axios.post(`${ANAKIN_API_BASE}/holocron/task`, body, {
      headers,
      timeout: PER_REQUEST_TIMEOUT_MS,
    });
    const startData = startRes.data as { job_id?: unknown; jobId?: unknown } | undefined;
    const candidate =
      startData && typeof startData.job_id === 'string'
        ? startData.job_id
        : startData && typeof startData.jobId === 'string'
          ? startData.jobId
          : undefined;
    if (typeof candidate !== 'string') {
      console.warn('[anakin/wire] missing job_id in start response');
      return null;
    }
    jobId = candidate;
  } catch (err) {
    console.warn('[anakin/wire]', (err as Error).message);
    return null;
  }

  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);
    if (Date.now() >= deadline) break;
    try {
      const res = await axios.get(`${ANAKIN_API_BASE}/holocron/jobs/${jobId}`, {
        headers,
        timeout: PER_REQUEST_TIMEOUT_MS,
      });
      const data = res.data as { status?: string; data?: unknown } | undefined;
      const status = data?.status;
      if (status === 'completed') {
        return data?.data ?? null;
      }
      if (status === 'failed') {
        console.warn('[anakin/wire] job failed', jobId);
        return null;
      }
      // pending | processing | running → continue polling
    } catch (err) {
      console.warn('[anakin/wire/poll]', (err as Error).message);
      return null;
    }
  }

  console.warn('[anakin/wire] timed out after', totalTimeout, 'ms', 'jobId:', jobId);
  return null;
}

// --- Google Trends via Wire (with runtime catalog discovery) ----------------

export type GoogleTrendsResult = {
  timeline: { date: string; value: number }[];
  relatedQueries: string[];
  risingQueries: string[];
  topRegions: { name: string; score: number }[];
};

let CACHED_TRENDS_ACTION_ID: string | null = null;
let TRENDS_DISCOVERY_ATTEMPTED = false;

type CatalogEntry = { slug?: string; name?: string; description?: string };
type CatalogActionEntry = {
  action_id?: string;
  id?: string;
  name?: string;
  description?: string;
  params?: unknown;
};

function looksLikeTrendsCatalog(entry: CatalogEntry): boolean {
  const hay = `${entry.slug ?? ''} ${entry.name ?? ''} ${entry.description ?? ''}`.toLowerCase();
  return /google.*trends|\btrends?\b/.test(hay);
}

function looksLikeTrendsAction(action: CatalogActionEntry): boolean {
  const hay = `${action.action_id ?? ''} ${action.id ?? ''} ${action.name ?? ''} ${
    action.description ?? ''
  }`.toLowerCase();
  return /compare|interest.over.time|interest_over_time|trend/.test(hay);
}

async function discoverGoogleTrendsActionId(): Promise<string | null> {
  if (CACHED_TRENDS_ACTION_ID) return CACHED_TRENDS_ACTION_ID;
  if (TRENDS_DISCOVERY_ATTEMPTED) return CACHED_TRENDS_ACTION_ID;
  TRENDS_DISCOVERY_ATTEMPTED = true;

  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) return null;
  const headers = authHeaders(apiKey);

  let catalogs: CatalogEntry[] = [];
  try {
    const res = await axios.get(`${ANAKIN_API_BASE}/holocron/catalog`, {
      headers,
      timeout: PER_REQUEST_TIMEOUT_MS,
    });
    const data = res.data as unknown;
    if (Array.isArray(data)) {
      catalogs = data as CatalogEntry[];
    } else if (data && typeof data === 'object') {
      const r = data as Record<string, unknown>;
      const maybeArr = r.catalog ?? r.catalogs ?? r.data ?? r.results;
      if (Array.isArray(maybeArr)) catalogs = maybeArr as CatalogEntry[];
    }
  } catch (err) {
    console.warn('[anakin/wire/discovery]', (err as Error).message);
    return null;
  }

  const matched = catalogs.find(
    (c) => c && typeof c === 'object' && typeof c.slug === 'string' && looksLikeTrendsCatalog(c)
  );
  if (!matched || !matched.slug) {
    console.warn('[anakin/wire/discovery] no trends-like catalog found');
    return null;
  }

  let actions: CatalogActionEntry[] = [];
  try {
    const res = await axios.get(
      `${ANAKIN_API_BASE}/holocron/catalog/${encodeURIComponent(matched.slug)}`,
      { headers, timeout: PER_REQUEST_TIMEOUT_MS }
    );
    const data = res.data as unknown;
    if (Array.isArray(data)) {
      actions = data as CatalogActionEntry[];
    } else if (data && typeof data === 'object') {
      const maybeArr =
        (data as Record<string, unknown>).actions ??
        (data as Record<string, unknown>).items ??
        (data as Record<string, unknown>).data;
      if (Array.isArray(maybeArr)) actions = maybeArr as CatalogActionEntry[];
    }
  } catch (err) {
    console.warn('[anakin/wire/discovery] catalog detail fetch failed:', (err as Error).message);
    return null;
  }

  const action = actions.find(
    (a) => a && typeof a === 'object' && (typeof a.action_id === 'string' || typeof a.id === 'string') && looksLikeTrendsAction(a)
  );
  if (!action) {
    console.warn('[anakin/wire/discovery] no trends-like action in catalog', matched.slug);
    return null;
  }

  const resolvedId =
    typeof action.action_id === 'string'
      ? action.action_id
      : typeof action.id === 'string'
        ? action.id
        : null;
  if (!resolvedId) return null;

  CACHED_TRENDS_ACTION_ID = resolvedId;
  return resolvedId;
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseTimeline(raw: unknown): { date: string; value: number }[] {
  let arr: unknown[] | null = null;
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    // gt_interest_over_time returns { data: [...], keyword, geo, ... }
    for (const key of ['data', 'timeline_data', 'interest_over_time', 'timeline']) {
      const c = r[key];
      if (Array.isArray(c)) { arr = c; break; }
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  }
  if (!arr) return [];

  const points: { date: string; value: number }[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;

    // Prefer formatted_date, else convert Unix timestamp to YYYY-MM-DD
    let date: string | null = null;
    if (typeof r.formatted_date === 'string') {
      date = r.formatted_date;
    } else if (typeof r.date === 'string') {
      const ts = parseInt(r.date, 10);
      date = isNaN(ts) ? r.date : new Date(ts * 1000).toISOString().slice(0, 10);
    } else if (typeof r.time === 'string') {
      date = r.time;
    }

    const value =
      coerceNumber(r.value) ??
      coerceNumber(r.interest) ??
      (Array.isArray(r.values) && r.values.length > 0 ? coerceNumber((r.values as unknown[])[0]) : null);

    if (date && value !== null) points.push({ date, value });
  }
  // Return up to last 52 points (1 year of weekly data)
  return points.slice(-52);
}

function parseRelatedTop(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  let candidate: unknown = null;
  if (r.related_queries && typeof r.related_queries === 'object') {
    const rq = r.related_queries as Record<string, unknown>;
    candidate = rq.top ?? rq;
  }
  if (!candidate) candidate = r.top_queries ?? r.related_queries;
  if (!Array.isArray(candidate)) return [];
  const out: string[] = [];
  for (const item of candidate) {
    if (typeof item === 'string') out.push(item);
    else if (item && typeof item === 'object') {
      const ir = item as Record<string, unknown>;
      const q = typeof ir.query === 'string' ? ir.query : typeof ir.title === 'string' ? ir.title : null;
      if (q) out.push(q);
    }
    if (out.length >= 8) break;
  }
  return out;
}

function parseRelatedRising(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  let candidate: unknown = null;
  if (r.related_queries && typeof r.related_queries === 'object') {
    const rq = r.related_queries as Record<string, unknown>;
    candidate = rq.rising;
  }
  if (!candidate) candidate = r.rising_queries;
  if (!Array.isArray(candidate)) return [];
  const out: string[] = [];
  for (const item of candidate) {
    if (typeof item === 'string') out.push(item);
    else if (item && typeof item === 'object') {
      const ir = item as Record<string, unknown>;
      const q = typeof ir.query === 'string' ? ir.query : typeof ir.title === 'string' ? ir.title : null;
      if (q) out.push(q);
    }
    if (out.length >= 6) break;
  }
  return out;
}

function parseRegions(raw: unknown): { name: string; score: number }[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  let arr: unknown[] | null = null;
  for (const key of ['regions', 'interest_by_region', 'top_regions']) {
    const c = r[key];
    if (Array.isArray(c)) {
      arr = c;
      break;
    }
  }
  if (!arr) return [];
  const out: { name: string; score: number }[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const ir = item as Record<string, unknown>;
    const name =
      typeof ir.name === 'string'
        ? ir.name
        : typeof ir.location === 'string'
          ? ir.location
          : typeof ir.geo === 'string'
            ? ir.geo
            : null;
    const score = coerceNumber(ir.score) ?? coerceNumber(ir.value) ?? coerceNumber(ir.interest);
    if (name && score !== null) out.push({ name, score });
    if (out.length >= 5) break;
  }
  return out;
}

export async function googleTrends(
  keywords: string[],
  opts?: { timeframe?: string; geo?: string }
): Promise<GoogleTrendsResult | null> {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) {
    console.warn('[anakin/trends] missing ANAKIN_API_KEY');
    return null;
  }

  if (!keywords || keywords.length === 0) {
    console.warn('[anakin/trends] no keywords provided');
    return null;
  }

  // Use first keyword as the primary search term (gt_interest_over_time takes singular 'keyword')
  const keyword = keywords[0];
  const timeframe = opts?.timeframe ?? 'today 12-m';
  const geo = opts?.geo ?? 'US';

  // Two parallel Wire calls: timeline + related queries
  const [timelineResult, relatedResult] = await Promise.all([
    wireTask(
      'gt_interest_over_time',
      { keyword, timeframe, geo },
      { timeoutMs: 30000, pollIntervalMs: 3000 }
    ).catch(() => null),
    wireTask(
      'gt_related_queries',
      { keyword, timeframe, geo },
      { timeoutMs: 30000, pollIntervalMs: 3000 }
    ).catch(() => null),
  ]);

  const timeline = timelineResult ? parseTimeline(timelineResult) : [];
  const relatedQueries = relatedResult ? parseRelatedTop(relatedResult) : [];
  const risingQueries = relatedResult ? parseRelatedRising(relatedResult) : [];
  const topRegions: { name: string; score: number }[] = [];

  if (timeline.length === 0 && relatedQueries.length === 0 && risingQueries.length === 0) {
    return null;
  }

  return { timeline, relatedQueries, risingQueries, topRegions };
}

// ---------------------------------------------------------------------------
// Reddit + YouTube via Wire (with runtime catalog discovery)
// ---------------------------------------------------------------------------

type ResolvedAction = { actionId: string; queryParam: string };

let resolvedRedditAction: ResolvedAction | null = null;
let redditDiscoveryAttempted = false;
let resolvedYouTubeAction: ResolvedAction | null = null;
let youtubeDiscoveryAttempted = false;

const QUERY_PARAM_CANDIDATES = ['query', 'q', 'keyword', 'keywords', 'search', 'search_query', 'term'];

function extractActionParametersSchema(action: CatalogActionEntry): Record<string, unknown> | null {
  const a = action as unknown as Record<string, unknown>;
  for (const key of ['parameters', 'params', 'input_schema', 'schema']) {
    const candidate = a[key];
    if (!candidate || typeof candidate !== 'object') continue;

    // Array format: [{ name: "query", type: "string", ... }] — convert to properties bag.
    if (Array.isArray(candidate)) {
      const bag: Record<string, unknown> = {};
      for (const item of candidate) {
        if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).name === 'string') {
          const it = item as Record<string, unknown>;
          bag[it.name as string] = { type: it.type ?? 'string', required: it.required };
        }
      }
      if (Object.keys(bag).length > 0) return bag;
      continue;
    }

    // JSON Schema object: may have a "properties" sub-key or be the bag itself.
    const c = candidate as Record<string, unknown>;
    if (c.properties && typeof c.properties === 'object') {
      return c.properties as Record<string, unknown>;
    }
    return c;
  }
  return null;
}

function findStringQueryParam(properties: Record<string, unknown>): string | null {
  for (const cand of QUERY_PARAM_CANDIDATES) {
    const prop = properties[cand];
    if (prop && typeof prop === 'object') {
      const p = prop as Record<string, unknown>;
      if (p.type === 'string' || p.type === undefined) {
        return cand;
      }
    }
  }
  // Fallback: any property whose name contains "query"/"search"/"term"/"keyword".
  for (const key of Object.keys(properties)) {
    if (/query|search|term|keyword/i.test(key)) {
      const prop = properties[key];
      if (prop && typeof prop === 'object') {
        const p = prop as Record<string, unknown>;
        if (p.type === 'string' || p.type === undefined) {
          return key;
        }
      }
    }
  }
  return null;
}

async function fetchCatalogList(): Promise<CatalogEntry[]> {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) return [];
  const headers = authHeaders(apiKey);
  try {
    const res = await axios.get(`${ANAKIN_API_BASE}/holocron/catalog`, {
      headers,
      timeout: PER_REQUEST_TIMEOUT_MS,
    });
    const data = res.data as unknown;
    if (Array.isArray(data)) return data as CatalogEntry[];
    if (data && typeof data === 'object') {
      const r = data as Record<string, unknown>;
      const maybe = r.catalog ?? r.catalogs ?? r.data ?? r.results;
      if (Array.isArray(maybe)) return maybe as CatalogEntry[];
    }
  } catch (err) {
    console.warn('[anakin/wire/discovery]', (err as Error).message);
  }
  return [];
}

async function fetchCatalogDetail(slug: string): Promise<CatalogActionEntry[]> {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) return [];
  const headers = authHeaders(apiKey);
  try {
    const res = await axios.get(
      `${ANAKIN_API_BASE}/holocron/catalog/${encodeURIComponent(slug)}`,
      { headers, timeout: PER_REQUEST_TIMEOUT_MS }
    );
    const data = res.data as unknown;
    if (Array.isArray(data)) return data as CatalogActionEntry[];
    if (data && typeof data === 'object') {
      const r = data as Record<string, unknown>;
      const maybe = r.actions ?? r.items ?? r.data;
      if (Array.isArray(maybe)) return maybe as CatalogActionEntry[];
    }
  } catch (err) {
    console.warn('[anakin/wire/discovery] catalog detail fetch failed:', (err as Error).message);
  }
  return [];
}

async function discoverWireAction(
  catalogRegex: RegExp,
  actionRegex: RegExp,
  logTag: string
): Promise<ResolvedAction | null> {
  const catalogs = await fetchCatalogList();
  if (catalogs.length === 0) {
    console.warn(`[anakin/${logTag}-discovery] catalog list empty or fetch failed`);
    return null;
  }

  const matchedCatalog = catalogs.find((c) => {
    if (!c || typeof c !== 'object') return false;
    const hay = `${c.slug ?? ''} ${c.name ?? ''} ${c.description ?? ''}`;
    return catalogRegex.test(hay);
  });
  if (!matchedCatalog || typeof matchedCatalog.slug !== 'string') {
    console.warn(`[anakin/${logTag}-discovery] no matching catalog found`);
    return null;
  }

  const actions = await fetchCatalogDetail(matchedCatalog.slug);
  if (actions.length === 0) {
    console.warn(`[anakin/${logTag}-discovery] no actions in catalog`, matchedCatalog.slug);
    return null;
  }

  for (const action of actions) {
    if (!action || typeof action !== 'object') continue;
    const actionId =
      typeof action.action_id === 'string'
        ? action.action_id
        : typeof action.id === 'string'
          ? action.id
          : null;
    if (!actionId) continue;
    const hay = `${action.action_id ?? ''} ${action.id ?? ''} ${action.name ?? ''} ${
      action.description ?? ''
    }`;
    if (!actionRegex.test(hay)) continue;
    const properties = extractActionParametersSchema(action);
    if (!properties) continue;
    const queryParam = findStringQueryParam(properties);
    if (!queryParam) continue;
    return { actionId, queryParam };
  }

  console.warn(`[anakin/${logTag}-discovery] no suitable action with string query param`);
  return null;
}

async function discoverRedditAction(): Promise<ResolvedAction | null> {
  if (resolvedRedditAction) return resolvedRedditAction;
  if (redditDiscoveryAttempted) return resolvedRedditAction;
  redditDiscoveryAttempted = true;
  const found = await discoverWireAction(
    /reddit/i,
    /search|posts|discussion|find/i,
    'reddit'
  );
  if (found) resolvedRedditAction = found;
  return resolvedRedditAction;
}

async function discoverYouTubeAction(): Promise<ResolvedAction | null> {
  if (resolvedYouTubeAction) return resolvedYouTubeAction;
  if (youtubeDiscoveryAttempted) return resolvedYouTubeAction;
  youtubeDiscoveryAttempted = true;
  const found = await discoverWireAction(
    /youtube/i,
    /search|video|find/i,
    'youtube'
  );
  if (found) resolvedYouTubeAction = found;
  return resolvedYouTubeAction;
}

function pickFirstArray(obj: Record<string, unknown>, keys: string[]): unknown[] | null {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v;
  }
  return null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    const n = coerceNumber(v);
    if (n !== null) return n;
  }
  return undefined;
}

function coerceISODate(v: unknown): string | undefined {
  if (typeof v === 'string' && v.length > 0) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString();
    return v; // pass-through if non-parseable string
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Could be epoch seconds or ms.
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

function parseRedditPosts(data: unknown): RedditPost[] {
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;
  let arr = pickFirstArray(root, ['posts', 'results', 'data', 'items']);
  if (!arr) {
    // Some APIs nest the array under an inner "data" object.
    const inner = root.data;
    if (inner && typeof inner === 'object') {
      arr = pickFirstArray(inner as Record<string, unknown>, ['posts', 'results', 'children', 'items']);
    }
  }
  if (!arr) return [];

  const posts: RedditPost[] = [];
  for (const entry of arr) {
    if (!entry || typeof entry !== 'object') continue;
    // Some entries are wrapped {kind, data: {...}} (Reddit-style).
    const e = entry as Record<string, unknown>;
    const obj: Record<string, unknown> =
      e.data && typeof e.data === 'object' ? (e.data as Record<string, unknown>) : e;

    const title = pickString(obj, ['title', 'name']);
    if (!title) continue;

    let subreddit = pickString(obj, ['subreddit', 'sub', 'community', 'subreddit_name_prefixed']) ?? '';
    subreddit = subreddit.replace(/^r\//i, '').trim();

    const score = pickNumber(obj, ['score', 'ups', 'upvotes', 'upvote_count']) ?? 0;
    const comments = pickNumber(obj, ['num_comments', 'comments', 'comment_count']);

    let url = pickString(obj, ['permalink', 'url', 'link']) ?? '';
    if (url && url.startsWith('/')) url = `https://reddit.com${url}`;
    if (!url) continue;

    const body = pickString(obj, ['selftext', 'body', 'content', 'text']);
    const snippet = body ? body.slice(0, 200) : undefined;

    const createdRaw =
      obj.created_utc ?? obj.created_at ?? obj.created ?? obj.date ?? obj.published_at;
    const createdAt = coerceISODate(createdRaw);

    posts.push({ title, subreddit, score, comments, url, snippet, createdAt });
    if (posts.length >= 6) break;
  }
  return posts;
}

function parseYouTubeVideos(data: unknown): YouTubeVideo[] {
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;
  let arr = pickFirstArray(root, ['videos', 'results', 'items', 'data']);
  if (!arr) {
    const inner = root.data;
    if (inner && typeof inner === 'object') {
      arr = pickFirstArray(inner as Record<string, unknown>, ['videos', 'results', 'items']);
    }
  }
  if (!arr) return [];

  const videos: YouTubeVideo[] = [];
  for (const entry of arr) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;

    const title = pickString(obj, ['title', 'video_title', 'name']);
    if (!title) continue;

    const channel =
      pickString(obj, ['channel', 'channel_name', 'channel_title', 'author', 'uploader']) ?? '';

    let url = pickString(obj, ['url', 'video_url', 'link']);
    if (!url) {
      const videoId = pickString(obj, ['video_id', 'videoId', 'id']);
      if (videoId) url = `https://youtube.com/watch?v=${videoId}`;
    }
    if (!url) continue;

    let thumbnail = pickString(obj, ['thumbnail', 'thumbnail_url', 'thumb']);
    if (!thumbnail) {
      const thumbs = obj.thumbnails;
      if (Array.isArray(thumbs) && thumbs.length > 0) {
        const first = thumbs[0];
        if (typeof first === 'string') thumbnail = first;
        else if (first && typeof first === 'object') {
          const u = (first as Record<string, unknown>).url;
          if (typeof u === 'string') thumbnail = u;
        }
      } else if (thumbs && typeof thumbs === 'object') {
        const t = thumbs as Record<string, unknown>;
        const candidate = t.default ?? t.high ?? t.medium ?? t.standard;
        if (typeof candidate === 'string') thumbnail = candidate;
        else if (candidate && typeof candidate === 'object') {
          const u = (candidate as Record<string, unknown>).url;
          if (typeof u === 'string') thumbnail = u;
        }
      }
    }

    const views = pickNumber(obj, ['views', 'view_count', 'viewCount']);
    const publishedRaw =
      obj.published_at ?? obj.publish_date ?? obj.publishedAt ?? obj.date ?? obj.upload_date;
    const publishedAt = coerceISODate(publishedRaw);

    const desc = pickString(obj, ['description', 'snippet', 'summary']);
    const description = desc ? desc.slice(0, 200) : undefined;

    videos.push({ title, channel, url, thumbnail, views, publishedAt, description });
    if (videos.length >= 6) break;
  }
  return videos;
}

function parseYouTubeTotal(data: unknown, fallback: number): number {
  if (!data || typeof data !== 'object') return fallback;
  const root = data as Record<string, unknown>;
  const n = pickNumber(root, ['total', 'count', 'total_results', 'totalResults']);
  return typeof n === 'number' ? n : fallback;
}

export async function redditSearch(
  query: string,
  opts?: { limit?: number }
): Promise<RedditSignals | null> {
  try {
    if (!process.env.ANAKIN_API_KEY) {
      console.warn('[anakin/reddit] missing ANAKIN_API_KEY');
      return null;
    }
    if (!query || query.trim().length === 0) return null;

    const resolved = await discoverRedditAction();
    if (!resolved) {
      console.warn('[anakin/reddit] could not resolve action_id');
      return null;
    }

    const limit = opts?.limit ?? 6;
    const params: Record<string, unknown> = {
      [resolved.queryParam]: query,
      limit,
      count: limit,
      max_results: limit,
    };

    const result = await wireTask(resolved.actionId, params, {
      timeoutMs: 30000,
      pollIntervalMs: 3000,
    });
    if (!result) return null;

    const posts = parseRedditPosts(result);
    if (posts.length === 0) return null;

    const subSet: string[] = [];
    for (const p of posts) {
      if (p.subreddit && !subSet.includes(p.subreddit)) subSet.push(p.subreddit);
      if (subSet.length >= 5) break;
    }

    return { posts, topSubreddits: subSet };
  } catch (err) {
    console.warn('[anakin/reddit]', (err as Error).message);
    return null;
  }
}

export async function youtubeSearch(
  query: string,
  opts?: { limit?: number }
): Promise<YouTubeSignals | null> {
  try {
    if (!process.env.ANAKIN_API_KEY) {
      console.warn('[anakin/youtube] missing ANAKIN_API_KEY');
      return null;
    }
    if (!query || query.trim().length === 0) return null;

    const resolved = await discoverYouTubeAction();
    if (!resolved) {
      console.warn('[anakin/youtube] could not resolve action_id');
      return null;
    }

    const limit = opts?.limit ?? 6;
    const params: Record<string, unknown> = {
      [resolved.queryParam]: query,
      limit,
      count: limit,
      max_results: limit,
    };

    const result = await wireTask(resolved.actionId, params, {
      timeoutMs: 30000,
      pollIntervalMs: 3000,
    });
    if (!result) return null;

    const videos = parseYouTubeVideos(result);
    if (videos.length === 0) return null;

    const totalResults = parseYouTubeTotal(result, videos.length);
    return { videos, totalResults };
  } catch (err) {
    console.warn('[anakin/youtube]', (err as Error).message);
    return null;
  }
}
