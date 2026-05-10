'use client';

import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EXAMPLE_IDEAS = [
  'AI hiring platform for remote developers',
  'Async standup tool for distributed product teams',
  'Carbon offset marketplace for SMBs',
];

const MIN_LENGTH = 12;
const MAX_ROWS = 6;

export function IdeaInput() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Autosize the textarea up to MAX_ROWS.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const styles = window.getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 24;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const maxHeight = lineHeight * MAX_ROWS + paddingTop + paddingBottom;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value]);

  const submit = () => {
    if (pending) return;
    const trimmed = value.trim();
    if (trimmed.length < MIN_LENGTH) {
      setError('Tell us a bit more about the idea.');
      return;
    }
    setError(null);
    setPending(true);
    router.push(`/dashboard?idea=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const fillExample = (idea: string) => {
    setValue(idea);
    setError(null);
    // Focus the textarea so the user can edit immediately.
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className={cn(
          'flex flex-col gap-3 p-3 sm:p-4 rounded-2xl text-left',
          'bg-white border border-zinc-200',
          'shadow-sm',
          'focus-within:border-zinc-300 transition'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="e.g. An AI tool that helps solo founders validate startup ideas before building"
          aria-label="Startup idea"
          spellCheck={true}
          className={cn(
            'w-full resize-none bg-white border border-zinc-200 outline-none rounded-xl shadow-sm',
            'px-3 py-2 text-base leading-relaxed',
            'text-zinc-900 placeholder:text-zinc-400',
            'focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 focus:outline-none focus-visible:outline-none'
          )}
        />

        <div className="flex items-center justify-between gap-3 px-1">
          <p className="hidden sm:block text-xs text-zinc-500">
            <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              Enter
            </kbd>
            <span className="ml-1.5">to validate</span>
            <span className="mx-2 text-zinc-300">·</span>
            <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              Shift + Enter
            </kbd>
            <span className="ml-1.5">for newline</span>
          </p>

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className={cn(
              'ml-auto h-11 px-5 gap-2 rounded-lg text-base font-bold',
              'bg-zinc-900 hover:bg-zinc-700 text-white shadow-sm',
              'transition'
            )}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Validating
              </>
            ) : (
              <>
                Validate idea
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </form>

      {error ? (
        <p className="mt-2 px-1 text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 px-1 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-zinc-500">
        <span className="text-xs uppercase tracking-wider text-zinc-600">
          Try one of these:
        </span>
        {EXAMPLE_IDEAS.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => fillExample(idea)}
            className={cn(
              'bg-white border border-zinc-200 text-zinc-600',
              'hover:border-zinc-400 hover:text-zinc-800',
              'text-xs font-medium rounded-full px-3 py-1.5 shadow-sm',
              'transition'
            )}
          >
            {idea}
          </button>
        ))}
      </div>
    </div>
  );
}

export default IdeaInput;
