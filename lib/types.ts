export type Competitor = {
  name: string;
  url?: string;
  description: string;
  logo?: string;
};

export type TrendPoint = { date: string; value: number };

export type MarketDemand = {
  momentum: 'rising' | 'flat' | 'declining' | 'unknown';
  timeline: TrendPoint[];                // up to ~12 monthly points
  relatedQueries: string[];              // up to 8
  risingQueries: string[];               // up to 6
  topRegions?: { name: string; score: number }[]; // optional, up to 5
};

export type Recommendation = {
  category: 'positioning' | 'gtm' | 'differentiation' | 'product' | 'other';
  title: string;        // ≤ 80 chars
  detail: string;       // 1-2 sentences
};

export type ValidationReport = {
  idea: string;                          // echoed input
  keywords: string[];                    // extracted by extractKeywords
  validationScore: number;               // 0-100
  scoreBreakdown: {
    demand: number;
    differentiation: number;
    competition: number;
    feasibility: number;
  };
  oneLineVerdict: string;                // ≤ 140 chars
  marketDemand: MarketDemand;
  competitors: Competitor[];
  opportunities: string[];               // up to 5
  risks: string[];                       // up to 5
  recommendations: Recommendation[];     // up to 6
  evidence: {
    trendsAvailable: boolean;
    competitorSourcesUsed: number;       // count of search/crawl sources hit
    searchCitations: { title: string; url: string }[]; // for "evidence trail" UI
    redditDiscussionsCount?: number;
    youtubeVideosCount?: number;
    agenticResearchUsed?: boolean;
  };
  redditSignals?: RedditSignals;
  youtubeSignals?: YouTubeSignals;
  generatedAt: string;
};

export type RedditPost = {
  title: string;
  subreddit: string;        // without leading "r/"
  score: number;            // upvotes
  comments?: number;
  url: string;              // permalink (https://reddit.com/...)
  snippet?: string;         // first ~200 chars of body
  createdAt?: string;       // ISO date if available
};

export type RedditSignals = {
  posts: RedditPost[];               // up to 6
  topSubreddits: string[];           // up to 5
  sentiment?: 'positive' | 'mixed' | 'negative' | 'unknown';
};

export type YouTubeVideo = {
  title: string;
  channel: string;
  url: string;                       // https://youtube.com/watch?v=...
  thumbnail?: string;
  views?: number;
  publishedAt?: string;              // ISO if available
  description?: string;              // first ~200 chars
};

export type YouTubeSignals = {
  videos: YouTubeVideo[];            // up to 6
  totalResults?: number;
};
