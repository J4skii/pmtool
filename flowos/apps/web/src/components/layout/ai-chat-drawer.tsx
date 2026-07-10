'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AiChatDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, pending, open]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || pending) return;

    const userMessage: ChatMessage = { role: 'user', content: message };
    const history = messages;
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPending(true);
    try {
      const { reply } = await api.post<{ reply: string }>('/ai/chat', { message, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'AI is unavailable right now. Please try again later.' },
      ]);
    } finally {
      setPending(false);
    }
  };

  if (!open) {
    return (
      <Button
        size="icon"
        aria-label="Open AI assistant"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
      </Button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="AI Assistant"
      className="fixed bottom-6 right-6 z-40 flex h-[32rem] w-96 max-w-[calc(100vw-3rem)] flex-col rounded-lg border bg-card text-card-foreground shadow-lg"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold">AI Assistant</h2>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close AI assistant" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="m-auto text-center text-sm text-muted-foreground">
            Ask the AI assistant anything about your workspace.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                message.role === 'user'
                  ? 'self-end bg-primary text-primary-foreground'
                  : 'self-start bg-muted text-foreground',
              )}
            >
              {message.content}
            </div>
          ))
        )}
        {pending ? (
          <div className="max-w-[85%] self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            Thinking…
          </div>
        ) : null}
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="flex items-center gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a question…"
          aria-label="Message the AI assistant"
          disabled={pending}
        />
        <Button type="submit" loading={pending} disabled={input.trim().length === 0}>
          Send
        </Button>
      </form>
    </div>
  );
}
