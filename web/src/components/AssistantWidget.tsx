"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { X, Send, Loader2, User } from "lucide-react";
import { cn } from "@/lib/cn";

function ShieldBadge({
  size = "md",
  ring = true,
}: {
  size?: "sm" | "md" | "lg";
  ring?: boolean;
}) {
  const dim =
    size === "lg" ? "h-9 w-9" : size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const px = size === "lg" ? "36px" : size === "sm" ? "24px" : "32px";
  return (
    <span
      className={cn(
        "relative inline-flex flex-none items-center justify-center rounded-full bg-white",
        ring ? "ring-1 ring-amber-accent/40" : "",
        dim
      )}
    >
      <Image
        src="/logo-shield.webp"
        alt=""
        fill
        sizes={px}
        className="object-contain p-[2px]"
      />
    </span>
  );
}

// Tight markdown component map: handle the constructs Gemini actually emits
// (bold, bullets, ordered lists, inline code, links). Internal /paths render
// as Next.js <Link> for client-side nav; external URLs open in a new tab.
const MD_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-1.5 ml-4 list-disc space-y-1 marker:text-amber-accent">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-1.5 ml-4 list-decimal space-y-1 marker:text-amber-accent">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-ink-50">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = !!className;
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-md bg-ink-900 p-2 text-xs">
          <code className="font-mono text-ink-100">{children}</code>
        </pre>
      );
    }
    return (
      <code className="rounded bg-ink-800 px-1 py-0.5 font-mono text-[12px] text-ink-100">
        {children}
      </code>
    );
  },
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    const isInternal = typeof href === "string" && href.startsWith("/");
    if (isInternal) {
      return (
        <Link
          href={href}
          className="font-medium text-amber-accent underline underline-offset-2 hover:text-amber-deep"
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-amber-accent underline underline-offset-2 hover:text-amber-deep"
      >
        {children}
      </a>
    );
  },
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-2 font-display text-base font-bold">{children}</h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-2 font-display text-base font-bold">{children}</h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mt-2 font-display text-sm font-bold">{children}</h4>
  ),
  hr: () => <hr className="my-3 border-ink-700" />,
};

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

const SUGGESTIONS = [
  "Search: find open event-security leads in my area.",
  "Draft a fast response to my newest urgent lead.",
  "How do I improve my profile to win more event-security jobs?",
  "Should I enable auto top-up at my current usage?",
  "Summarize the open leads I should call first.",
];

export function AssistantWidget({ companyName }: { companyName?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      // Auto-scroll to the latest message and focus the input.
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      textareaRef.current?.focus();
    }
  }, [open, messages, pending]);

  // Lock body scroll while the widget is open so the page underneath
  // doesn't move when users interact with the chat — particularly on
  // mobile, where a soft keyboard otherwise leaves the page draggable
  // behind the panel.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevTouch;
    };
  }, [open]);

  // Close on Escape — small QoL on desktop and the iOS hardware-keyboard.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setError(null);
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { content?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong.");
      } else if (data.content) {
        setMessages([...next, { role: "assistant", content: data.content }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-navy-900 px-5 text-white shadow-lift transition hover:bg-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
        aria-label="Open assistant"
      >
        <ShieldBadge size="md" />
        <span className="font-display text-sm font-bold tracking-tight">
          Ask Vanguard
        </span>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop — only visible on mobile sheet view, lets the user tap
          outside to dismiss without exposing the page below. */}
      <button
        type="button"
        aria-label="Close assistant"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] sm:hidden"
      />
      <div
        className="fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col overflow-hidden border border-ink-600 bg-white shadow-card-strong sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto sm:h-[min(620px,calc(100dvh-4rem))] sm:w-[min(420px,calc(100vw-2rem))] sm:rounded-2xl"
        style={{ height: "100dvh" }}
        role="dialog"
        aria-modal="true"
        aria-label="Vanguard assistant"
      >
      <header className="flex items-center justify-between gap-3 bg-navy-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <ShieldBadge size="lg" />
          <div>
            <p className="font-display text-sm font-bold leading-tight">
              Vanguard Assistant
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              Powered by Vanguard AI
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close assistant"
          className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-ink-600 bg-ink-900 p-4">
              <p className="font-display text-base font-bold">
                Hello{companyName ? `, ${companyName}` : ""}.
              </p>
              <p className="mt-1.5 text-sm text-ink-300">
                I can see your live profile, services, leads, responses, and
                billing state. Ask me anything about running your account on
                Vanguard.
              </p>
            </div>
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ink-400">
                Try asking
              </p>
              <ul className="grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => send(s)}
                      className="w-full rounded-xl border border-ink-600 bg-white px-3 py-2 text-left text-sm hover:border-amber-accent hover:bg-amber-accent/5"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3">
            {messages.map((m, i) => (
              <li
                key={i}
                className={cn(
                  "flex gap-2.5",
                  m.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                {m.role === "user" ? (
                  <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full bg-navy-900 text-white">
                    <User className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="mt-0.5">
                    <ShieldBadge size="sm" />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "whitespace-pre-wrap bg-navy-900 text-white"
                      : "border border-ink-600 bg-white text-ink-50"
                  )}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={MD_COMPONENTS}
                    >
                      {m.content}
                    </ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              </li>
            ))}
            {pending && (
              <li className="flex gap-2.5">
                <span className="mt-0.5">
                  <ShieldBadge size="sm" />
                </span>
                <div className="rounded-2xl border border-ink-600 bg-white px-3.5 py-2.5 text-sm text-ink-300">
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin" />{" "}
                  Thinking…
                </div>
              </li>
            )}
            {error && (
              <li className="rounded-xl border border-red-400 bg-red-100 px-3 py-2 text-xs text-red-900">
                {error}
              </li>
            )}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-ink-600 bg-ink-900 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-2 rounded-xl border border-ink-600 bg-white p-2 focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-700/15">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about leads, billing, profile…"
            disabled={pending}
            className="max-h-32 flex-1 resize-none bg-transparent px-1.5 py-1 text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-navy-900 text-white transition hover:bg-navy-800 disabled:opacity-40"
            aria-label="Send"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-ink-400">
          Enter to send · Shift+Enter for new line
        </p>
      </form>
      </div>
    </>
  );
}
