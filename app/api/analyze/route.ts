import { NextRequest, NextResponse } from 'next/server';
import {
  googleTrends,
  searchCitations,
  redditSearch,
  youtubeSearch,
} from '@/lib/anakin';
import { extractKeywords, synthesizeValidation } from '@/lib/openai';
import type {
  Competitor,
  MarketDemand,
  TrendPoint,
  ValidationReport,
} from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Snippet = { title: string; url: string; snippet: string };

function deriveMomentum(timeline: TrendPoint[]): MarketDemand['momentum'] {
  if (!timeline || timeline.length < 4) return 'unknown';
  const last3 = timeline.slice(-3);
  const prior = timeline.slice(0, Math.max(0, timeline.length - 3));
  if (prior.length === 0) return 'unknown';
  const avg = (arr: TrendPoint[]) => arr.reduce((s, p) => s + (p.value || 0), 0) / arr.length;
  const recentAvg = avg(last3);
  const priorAvg = avg(prior.slice(-6));
  if (priorAvg === 0 && recentAvg === 0) return 'flat';
  if (priorAvg === 0) return recentAvg > 0 ? 'rising' : 'flat';
  const ratio = recentAvg / priorAvg;
  if (ratio >= 1.15) return 'rising';
  if (ratio <= 0.85) return 'declining';
  return 'flat';
}

function buildTimelineSummary(
  timeline: TrendPoint[],
  momentum: MarketDemand['momentum']
): string {
  if (!timeline || timeline.length < 2) return 'No timeline data available.';
  const first = timeline[0]?.value ?? 0;
  const last = timeline[timeline.length - 1]?.value ?? 0;
  if (first === 0) {
    return `Search interest is ${momentum} with latest reading at ${last}.`;
  }
  const pctChange = Math.round(((last - first) / first) * 100);
  const direction = pctChange >= 0 ? 'grew' : 'fell';
  return `Search interest ${direction} ~${Math.abs(pctChange)}% over the available timeline (momentum: ${momentum}).`;
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function competitorNameFromTitle(title: string, host: string): string {
  if (title) {
    // Use the first chunk before common separators.
    const parts = title.split(/\s[\|\-–—:•]\s/);
    const first = (parts[0] || title).trim();
    if (first.length > 0 && first.length <= 60) return first;
  }
  // Fallback: use host root segment, capitalized.
  const root = host.split('.')[0] || host;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

function buildCompetitorsFromSnippets(snippets: Snippet[]): Competitor[] {
  const seenHosts = new Set<string>();
  const out: Competitor[] = [];
  for (const s of snippets) {
    const host = safeHostname(s.url);
    if (!host) continue;
    if (seenHosts.has(host)) continue;
    seenHosts.add(host);
    const name = competitorNameFromTitle(s.title, host);
    const description = (s.snippet || '').slice(0, 120);
    out.push({ name, url: s.url, description });
    if (out.length >= 3) break;
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const idea = (body as { idea?: unknown } | null)?.idea;
    if (typeof idea !== 'string' || idea.trim().length < 8) {
      return NextResponse.json(
        { error: 'idea must be a string of at least 8 characters' },
        { status: 400 }
      );
    }
    const ideaTrimmed = idea.trim();

    // 1. Extract keywords.
    const keywords = extractKeywords(ideaTrimmed);

    // 2. Parallel evidence gathering.
    const queryString = keywords.length > 0 ? keywords.join(' ') : ideaTrimmed;
    const [trendsResult, citationsResult, redditResult, youtubeResult] =
      await Promise.all([
        keywords.length > 0 ? googleTrends(keywords) : Promise.resolve(null),
        searchCitations(`top 3 competitors and market overview for: ${ideaTrimmed}`),
        redditSearch(queryString).catch(() => null),
        youtubeSearch(queryString).catch(() => null),
      ]);

    const timeline: TrendPoint[] = trendsResult?.timeline ?? [];
    const momentum = deriveMomentum(timeline);
    const relatedQueries = trendsResult?.relatedQueries ?? [];
    const risingQueries = trendsResult?.risingQueries ?? [];
    const topRegions = trendsResult?.topRegions ?? [];

    const snippets: Snippet[] = citationsResult?.snippets ?? [];
    const competitors = buildCompetitorsFromSnippets(snippets);

    const timelineSummary = buildTimelineSummary(timeline, momentum);

    // 3. Synthesize validation.
    const synthesis = await synthesizeValidation({
      idea: ideaTrimmed,
      keywords,
      trends: {
        momentum,
        relatedQueries,
        risingQueries,
        topRegions,
        timelineSummary,
      },
      competitors: competitors.map((c) => ({
        name: c.name,
        url: c.url,
        snippet: c.description,
      })),
      searchSnippets: snippets.slice(0, 6),
      redditPosts: redditResult?.posts.slice(0, 5).map((p) => ({
        title: p.title,
        subreddit: p.subreddit,
        score: p.score,
        snippet: p.snippet,
      })),
      youtubeVideos: youtubeResult?.videos.slice(0, 5).map((v) => ({
        title: v.title,
        channel: v.channel,
        views: v.views,
        description: v.description,
      })),
    });

    const marketDemand: MarketDemand = {
      momentum,
      timeline,
      relatedQueries,
      risingQueries,
      topRegions,
    };

    const report: ValidationReport = {
      idea: ideaTrimmed,
      keywords,
      validationScore: synthesis.validationScore,
      scoreBreakdown: synthesis.scoreBreakdown,
      oneLineVerdict: synthesis.oneLineVerdict,
      marketDemand,
      competitors,
      opportunities: synthesis.opportunities,
      risks: synthesis.risks,
      recommendations: synthesis.recommendations,
      redditSignals: redditResult ?? undefined,
      youtubeSignals: youtubeResult ?? undefined,
      evidence: {
        trendsAvailable: !!trendsResult,
        competitorSourcesUsed: snippets.length,
        searchCitations: snippets
          .slice(0, 6)
          .map((s) => ({ title: s.title, url: s.url })),
        redditDiscussionsCount: redditResult?.posts.length ?? 0,
        youtubeVideosCount: youtubeResult?.videos.length ?? 0,
        agenticResearchUsed: false,
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.warn('[api/analyze]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
