"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Loader2, Send } from "lucide-react";
import { createClient } from "@insforge/sdk";
import { sendMessageAction, markReadAction } from "@/app/messages/actions";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type Props = {
  conversationId: string;
  currentUserId: string;
  counterpartName: string;
  initialMessages: ChatMessage[];
  emptyHint?: string;
  /** Optional "context line" rendered above the messages (lead title etc). */
  contextLine?: string;
};

export function ChatPanel({
  conversationId,
  currentUserId,
  counterpartName,
  initialMessages,
  emptyHint = "Send a message to kick things off.",
  contextLine,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const insforge = useMemo(() => {
    return createClient({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
      anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    });
  }, []);

  // Subscribe + listen for INSERT_message events.
  useEffect(() => {
    let active = true;
    const channel = `conversation:${conversationId}`;

    const handler = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const p = payload as Record<string, unknown>;
      if (p.conversation_id !== conversationId) return;
      const msg: ChatMessage = {
        id: String(p.id),
        conversation_id: String(p.conversation_id),
        sender_id: String(p.sender_id),
        body: String(p.body),
        read_at: null,
        created_at: String(p.created_at ?? new Date().toISOString()),
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    (async () => {
      try {
        await insforge.realtime.connect();
        if (!active) return;
        const sub = await insforge.realtime.subscribe(channel);
        if (!sub.ok) {
          console.error("[chat subscribe]", sub.error);
          return;
        }
        insforge.realtime.on("INSERT_message", handler);
      } catch (e) {
        console.error("[chat realtime]", e);
      }
    })();

    return () => {
      active = false;
      try {
        insforge.realtime.off("INSERT_message", handler);
        insforge.realtime.unsubscribe(channel);
      } catch {
        // ignore — already torn down
      }
    };
  }, [conversationId, insforge]);

  // Mark the conversation read on mount and whenever we land here.
  useEffect(() => {
    const fd = new FormData();
    fd.append("conversation_id", conversationId);
    markReadAction(fd).catch(() => {});
  }, [conversationId]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = body.trim();
      if (!trimmed || pending) return;
      const fd = new FormData();
      fd.append("conversation_id", conversationId);
      fd.append("body", trimmed);
      startTransition(async () => {
        await sendMessageAction(fd);
        setBody("");
      });
    },
    [body, conversationId, pending]
  );

  return (
    <section className="card-elev flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-ink-700 px-5 py-3">
        <div>
          <p className="font-display text-base font-bold leading-tight">
            {counterpartName}
          </p>
          {contextLine && (
            <p className="text-xs text-ink-400">{contextLine}</p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-900">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />
          Live
        </span>
      </header>

      <div
        ref={scrollRef}
        className="flex h-[440px] flex-col gap-2 overflow-y-auto bg-ink-900 px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="m-auto max-w-xs text-center text-sm text-ink-300">
            {emptyHint}
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? "bg-amber-accent text-white"
                      : "bg-white text-ink-50"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? "text-white/70" : "text-ink-400"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-ink-700 bg-white px-3 py-3"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (body.trim() && !pending) {
                const fd = new FormData();
                fd.append("conversation_id", conversationId);
                fd.append("body", body.trim());
                startTransition(async () => {
                  await sendMessageAction(fd);
                  setBody("");
                });
              }
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder={`Message ${counterpartName}…`}
          className="flex-1 resize-none rounded-xl border border-ink-700 bg-white px-3 py-2 text-sm placeholder:text-ink-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
        />
        <button
          type="submit"
          disabled={!body.trim() || pending}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-accent bg-amber-accent px-4 text-sm font-bold text-white hover:bg-amber-deep disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </button>
      </form>
    </section>
  );
}
