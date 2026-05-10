import type { Recommendation } from './types';

// ── Keyword extraction (local, no API) ──────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','for','to','of','in','on','at','by','with','and','or','but',
  'that','this','is','are','was','be','it','i','you','we','my','your','can',
  'will','from','up','about','into','how','what','who','which','when','where',
  'some','any','all','use','using','used','make','build','create','help','need',
  'want','get','give','let','do','does','did','has','have','had','not','no',
]);

export function extractKeywords(idea: string): string[] {
  return idea
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 4);
}

// ── Synthesis types ──────────────────────────────────────────────────────────
export type SynthesisArgs = {
  idea: string;
  keywords: string[];
  trends: {
    momentum: string;
    relatedQueries: string[];
    risingQueries: string[];
    topRegions?: { name: string; score: number }[];
    timelineSummary: string;
  };
  competitors: { name: string; url?: string; snippet?: string }[];
  searchSnippets?: { title: string; url: string; snippet: string }[];
  redditPosts?: { title: string; subreddit: string; score: number; snippet?: string }[];
  youtubeVideos?: { title: string; channel: string; views?: number; description?: string }[];
  agenticSummary?: string;
};

export type SynthesisResult = {
  validationScore: number;
  scoreBreakdown: { demand: number; differentiation: number; competition: number; feasibility: number };
  oneLineVerdict: string;
  opportunities: string[];
  risks: string[];
  recommendations: Recommendation[];
};

// ── Evidence-based algorithmic scorer ────────────────────────────────────────

function scoreDemand(args: SynthesisArgs): number {
  let score = 30; // baseline

  switch (args.trends.momentum) {
    case 'rising':   score += 45; break;
    case 'flat':     score += 25; break;
    case 'declining': score += 5; break;
    default:          score += 15;
  }

  const redditCount = args.redditPosts?.length ?? 0;
  if (redditCount >= 5) score += 15;
  else if (redditCount >= 2) score += 8;
  else if (redditCount >= 1) score += 4;

  const avgRedditScore =
    redditCount > 0
      ? (args.redditPosts ?? []).reduce((s, p) => s + p.score, 0) / redditCount
      : 0;
  if (avgRedditScore > 100) score += 8;
  else if (avgRedditScore > 20) score += 4;

  const ytCount = args.youtubeVideos?.length ?? 0;
  if (ytCount >= 5) score += 10;
  else if (ytCount >= 2) score += 5;

  const totalViews = (args.youtubeVideos ?? []).reduce((s, v) => s + (v.views ?? 0), 0);
  if (totalViews > 100_000) score += 8;
  else if (totalViews > 10_000) score += 4;

  return Math.min(100, score);
}

function scoreDifferentiation(args: SynthesisArgs): number {
  const competitorCount = args.competitors.length;
  let score = competitorCount === 0 ? 75 : competitorCount <= 2 ? 65 : 45;
  if (args.trends.risingQueries.length >= 3) score += 10;
  else if (args.trends.risingQueries.length >= 1) score += 5;
  return Math.min(100, score);
}

function scoreCompetition(args: SynthesisArgs): number {
  const n = args.competitors.length;
  if (n === 0) return 85;
  if (n === 1) return 70;
  if (n === 2) return 58;
  return Math.max(30, 55 - (n - 2) * 5);
}

function scoreFeasibility(args: SynthesisArgs): number {
  let score = 65;
  // More keywords = more defined scope = more feasible
  if (args.keywords.length >= 3) score += 5;
  // Existing competitors prove the market is buildable
  if (args.competitors.length > 0) score += 10;
  return Math.min(100, score);
}

function buildVerdict(score: number, args: SynthesisArgs): string {
  const momentum = args.trends.momentum;
  const competitorCount = args.competitors.length;

  if (score >= 75) {
    const trendStr = momentum === 'rising' ? 'rising search interest' : 'steady demand';
    const compStr = competitorCount === 0 ? 'an open market' : `${competitorCount} known competitor${competitorCount > 1 ? 's' : ''}`;
    return `Strong signal — ${trendStr} and ${compStr} suggest this is worth building an MVP immediately.`;
  }
  if (score >= 55) {
    const weak = momentum === 'declining' ? 'declining trends' : competitorCount >= 3 ? 'a crowded field' : 'mixed signals';
    return `Moderate opportunity with ${weak} — validate demand with a landing page before committing to full build.`;
  }
  if (score >= 35) {
    return `Weak signals — limited evidence of organic demand. Consider narrowing the target audience or pivoting the value proposition.`;
  }
  return `Insufficient market evidence — this idea needs more demand validation before any development investment.`;
}

function buildOpportunities(args: SynthesisArgs): string[] {
  const ops: string[] = [];

  if (args.trends.momentum === 'rising') {
    ops.push('Rising search interest signals a growing market — early movers can capture significant share before saturation.');
  }
  if (args.competitors.length === 0) {
    ops.push('No direct competitors found — significant first-mover advantage available if demand is confirmed.');
  } else if (args.competitors.length <= 2) {
    ops.push(`Only ${args.competitors.length} direct competitor${args.competitors.length > 1 ? 's' : ''} — market is under-served and ripe for a differentiated entrant.`);
  }
  if ((args.redditPosts?.length ?? 0) >= 3) {
    const topSub = args.redditPosts?.[0]?.subreddit ?? 'relevant communities';
    ops.push(`Active Reddit discussions in r/${topSub} confirm real user pain points that are currently unmet.`);
  }
  if (args.trends.risingQueries.length >= 2) {
    ops.push(`Rising queries like "${args.trends.risingQueries[0]}" and "${args.trends.risingQueries[1]}" signal emerging niches to target.`);
  } else if (args.trends.risingQueries.length === 1) {
    ops.push(`"${args.trends.risingQueries[0]}" is a rising search query — a potential niche to own early.`);
  }
  if ((args.youtubeVideos?.length ?? 0) >= 3) {
    ops.push('YouTube content demand indicates strong audience awareness — educational and product-led growth strategies can work well.');
  }
  if (args.trends.topRegions && args.trends.topRegions.length >= 2) {
    const regions = args.trends.topRegions.slice(0, 2).map((r) => r.name).join(' and ');
    ops.push(`Strongest demand signals from ${regions} — geographic focus can accelerate early traction.`);
  }

  return ops.slice(0, 5).length > 0 ? ops.slice(0, 5) : [
    'Validate demand with a no-code landing page and measure conversion rate before building.',
  ];
}

function buildRisks(args: SynthesisArgs): string[] {
  const risks: string[] = [];

  if (args.trends.momentum === 'declining') {
    risks.push('Search interest is declining — market timing may be unfavorable; consider a sharper niche pivot.');
  }
  if (args.trends.momentum === 'unknown') {
    risks.push('No Google Trends data available — demand trajectory is unknown, requiring direct customer discovery.');
  }
  if (args.competitors.length >= 3) {
    risks.push(`${args.competitors.length} established competitors with existing user bases create high customer acquisition costs.`);
  }
  if (args.competitors.length >= 2) {
    const names = args.competitors.slice(0, 2).map((c) => c.name).join(' and ');
    risks.push(`Incumbent players like ${names} will be hard to displace without a strong differentiator.`);
  }
  if ((args.redditPosts?.length ?? 0) === 0) {
    risks.push('No Reddit discussions found — limited organic community interest may indicate low grassroots demand.');
  }
  if ((args.youtubeVideos?.length ?? 0) === 0 && (args.redditPosts?.length ?? 0) === 0) {
    risks.push('Absence of user-generated content suggests the problem may not be top-of-mind for the target audience.');
  }
  risks.push('B2B/prosumer tools face long sales cycles — plan for 6–12 month runway before revenue.');

  return risks.slice(0, 5);
}

function buildRecommendations(args: SynthesisArgs): Recommendation[] {
  const recs: Recommendation[] = [];

  recs.push({
    category: 'gtm',
    title: 'Ship a landing page first',
    detail: 'Build a one-page site explaining the value proposition, collect email sign-ups, and measure conversion rate before writing any product code.',
  });

  if ((args.redditPosts?.length ?? 0) >= 2) {
    const subs = [...new Set((args.redditPosts ?? []).map((p) => p.subreddit))].slice(0, 2);
    recs.push({
      category: 'gtm',
      title: `Engage in r/${subs[0]}`,
      detail: `Post problem-discovery questions in r/${subs.join(' and r/')} to validate pain points and recruit beta users from an already-interested audience.`,
    });
  }

  if (args.competitors.length >= 2) {
    recs.push({
      category: 'differentiation',
      title: 'Pick one underserved angle',
      detail: `Rather than competing head-on with ${args.competitors[0].name}, identify one use case they handle poorly and own that niche completely.`,
    });
  } else {
    recs.push({
      category: 'positioning',
      title: 'Define the category clearly',
      detail: 'With few direct competitors, you have the chance to define the category — invest in clear messaging that makes the problem and solution obvious in five seconds.',
    });
  }

  if (args.trends.momentum === 'rising' || args.trends.risingQueries.length > 0) {
    recs.push({
      category: 'product',
      title: 'Build for the rising query',
      detail: `"${args.trends.risingQueries[0] ?? args.keywords[0] ?? 'the core use case'}" is a rising search term — build product features that directly answer it and optimize content for organic discovery.`,
    });
  }

  recs.push({
    category: 'product',
    title: 'Start with a 10x workflow improvement',
    detail: 'Early adopters switch when the new tool is 10x better than their current solution — identify the one workflow that is most painful and nail it before expanding scope.',
  });

  return recs.slice(0, 5);
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function synthesizeValidation(args: SynthesisArgs): Promise<SynthesisResult> {
  const demand = scoreDemand(args);
  const differentiation = scoreDifferentiation(args);
  const competition = scoreCompetition(args);
  const feasibility = scoreFeasibility(args);

  const validationScore = Math.round(
    demand * 0.35 + differentiation * 0.25 + competition * 0.20 + feasibility * 0.20
  );

  return {
    validationScore,
    scoreBreakdown: { demand, differentiation, competition, feasibility },
    oneLineVerdict: buildVerdict(validationScore, args),
    opportunities: buildOpportunities(args),
    risks: buildRisks(args),
    recommendations: buildRecommendations(args),
  };
}
