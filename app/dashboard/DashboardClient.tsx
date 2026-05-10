'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import type { ValidationReport } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

import ValidationScore from '@/components/ValidationScore';
import MarketDemandPanel from '@/components/MarketDemandPanel';
import RedditSignalsPanel from '@/components/RedditSignalsPanel';
import YouTubeTrendsPanel from '@/components/YouTubeTrendsPanel';
import CompetitorCards from '@/components/CompetitorCards';
import OpportunitiesList from '@/components/OpportunitiesList';
import RisksList from '@/components/RisksList';
import RecommendationsPanel from '@/components/RecommendationsPanel';
import SignalBar from '@/components/SignalBar';
import AnalysisPipeline from '@/components/AnalysisPipeline';

const STAGE_DELAYS = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];

const REVEAL = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' as const },
};

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idea = searchParams.get('idea');

  const [report, setReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [loading, setLoading] = useState(true);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearStageTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  const runAnalyze = useCallback(
    async (signal?: AbortSignal) => {
      if (!idea) return;
      setLoading(true);
      setError(null);
      setStage(0);
      setReport(null);
      clearStageTimeouts();
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea }),
          signal,
        });
        if (!res.ok) {
          throw new Error(`Validation failed (${res.status})`);
        }
        const data: ValidationReport = await res.json();
        if (signal?.aborted) return;
        setReport(data);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
        toast.error('Validation failed', { description: msg });
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [idea, clearStageTimeouts],
  );

  // Redirect home if no idea
  useEffect(() => {
    if (!idea) {
      router.replace('/');
    }
  }, [idea, router]);

  // Initial fetch
  useEffect(() => {
    if (!idea) return;
    const controller = new AbortController();
    runAnalyze(controller.signal);
    return () => controller.abort();
  }, [idea, runAnalyze]);

  // Staged reveal once report arrives
  useEffect(() => {
    if (!report) return;
    clearStageTimeouts();
    STAGE_DELAYS.forEach((delay, i) => {
      const handle = setTimeout(() => setStage(i + 1), delay);
      timeoutsRef.current.push(handle);
    });
    return () => clearStageTimeouts();
  }, [report, clearStageTimeouts]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
              aria-label="Back to home"
            >
              <ArrowLeft className="size-3.5" />
              New idea
            </button>
            <span className="text-zinc-300">|</span>
            <span className="text-base tracking-tight text-zinc-900 font-black">orbit.ai</span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
            <span
              className={cn(
                'inline-block size-1.5 rounded-full',
                report ? 'bg-emerald-500' : 'bg-violet-500 animate-pulse',
              )}
            />
            {report ? 'Validation report' : 'Validating'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-14">
        {/* Idea echo */}
        {idea ? (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">Validating</p>
            <p className="text-xl leading-snug text-zinc-800 font-medium">&ldquo;{idea}&rdquo;</p>
          </div>
        ) : null}

        {/* Error state */}
        {error ? (
          <Card className="mx-auto max-w-xl border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <TriangleAlert className="size-4" />
                Validation failed
              </CardTitle>
              <CardDescription className="text-red-600">{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runAnalyze()}
                disabled={loading}
                className="gap-2"
                variant="secondary"
              >
                <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!error ? (
          <AnimatePresence mode="wait">
            {loading && !report ? (
              <AnalysisPipeline key="pipeline" />
            ) : (
              <motion.div
                key="report"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-14"
              >
                {/* Stage 1: Validation score */}
                {report && stage >= 1 ? (
                  <motion.div key="stage-1" {...REVEAL}>
                    <ValidationScore
                      score={report.validationScore}
                      breakdown={report.scoreBreakdown}
                      verdict={report.oneLineVerdict}
                    />
                  </motion.div>
                ) : null}

                {/* Signal bar */}
                {report && stage >= 1 ? (
                  <motion.div key="signal-bar" {...REVEAL} transition={{ ...REVEAL.transition, delay: 0.3 }}>
                    <SignalBar
                      momentum={report.marketDemand.momentum}
                      redditCount={report.redditSignals?.posts.length ?? 0}
                      competitorCount={report.competitors.length}
                      youtubeCount={report.youtubeSignals?.videos.length ?? 0}
                    />
                  </motion.div>
                ) : null}

                {/* Stage 2: Market demand */}
                {report && stage >= 2 ? (
                  <motion.div key="stage-2" {...REVEAL}>
                    <MarketDemandPanel demand={report.marketDemand} />
                  </motion.div>
                ) : null}

                {/* Stage 3: Reddit community signals (silent-skip if missing/empty) */}
                {report?.redditSignals && report.redditSignals.posts.length > 0 && stage >= 3 ? (
                  <motion.div key="stage-3" {...REVEAL}>
                    <RedditSignalsPanel signals={report.redditSignals} />
                  </motion.div>
                ) : null}

                {/* Stage 4: YouTube content trends (silent-skip if missing/empty) */}
                {report?.youtubeSignals && report.youtubeSignals.videos.length > 0 && stage >= 4 ? (
                  <motion.div key="stage-4" {...REVEAL}>
                    <YouTubeTrendsPanel signals={report.youtubeSignals} />
                  </motion.div>
                ) : null}

                {/* Stage 5: Competitors */}
                {report && stage >= 5 ? (
                  <motion.div key="stage-5" {...REVEAL}>
                    <CompetitorCards competitors={report.competitors} sectionNumber={2} />
                  </motion.div>
                ) : null}

                {/* Stages 6 + 7: opportunities & risks */}
                {report && stage >= 6 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div key="stage-6" {...REVEAL}>
                      <OpportunitiesList items={report.opportunities} sectionNumber={3} />
                    </motion.div>
                    <motion.div key="stage-7" {...REVEAL}>
                      <RisksList items={report.risks} sectionNumber={4} />
                    </motion.div>
                  </div>
                ) : null}

                {/* Stage 8: recommendations */}
                {report && stage >= 8 ? (
                  <motion.div key="stage-8" {...REVEAL}>
                    <RecommendationsPanel items={report.recommendations} sectionNumber={5} />
                  </motion.div>
                ) : null}

                {/* Footer */}
                {report && stage >= 8 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="py-8 text-center text-[11px] text-zinc-400 uppercase tracking-widest"
                  >
                    Report generated · {new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </motion.div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        ) : null}
      </main>
    </div>
  );
}
