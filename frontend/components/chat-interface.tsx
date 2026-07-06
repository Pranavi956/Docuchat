"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Loader2,
  BookOpen,
  Trash2,
  Bot,
  User,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getChatHistory, clearChatHistory, streamChat } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Source {
  content: string;
  page_number: number | null;
  chunk_index: number;
  similarity: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  documentId: string;
  documentName: string;
}

export function ChatInterface({ documentId, documentName }: ChatInterfaceProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadHistory();
    return () => stopStreamRef.current?.();
  }, [documentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadHistory() {
    setIsLoadingHistory(true);
    try {
      const token = await getToken();
      if (!token) return;
      const history = await getChatHistory(documentId, token);
      setMessages(
        history.map((m: { id: string; role: "user" | "assistant"; content: string; sources?: Source[] }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources,
        }))
      );
    } catch {
      // No history yet
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleClearHistory() {
    if (!confirm("Clear all conversation history?")) return;
    try {
      const token = await getToken();
      if (!token) return;
      await clearChatHistory(documentId, token);
      setMessages([]);
      toast({ title: "History cleared" });
    } catch (err: unknown) {
      toast({ title: "Failed to clear history", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setInput("");
    setIsLoading(true);

    const conversationHistory = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      stopStreamRef.current = streamChat(
        documentId,
        userMessage.content,
        conversationHistory,
        token,
        (text) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId ? { ...m, content: m.content + text } : m
            )
          );
        },
        (sources) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId ? { ...m, sources: sources as Source[] } : m
            )
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId ? { ...m, isStreaming: false } : m
            )
          );
          setIsLoading(false);
        },
        (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId
                ? { ...m, content: `Error: ${err}`, isStreaming: false }
                : m
            )
          );
          setIsLoading(false);
        }
      );
    } catch (err: unknown) {
      toast({ title: "Chat error", description: (err as Error).message, variant: "destructive" });
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function toggleSources(messageId: string) {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Chat header */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-medium text-sm truncate">{documentName}</span>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear history
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Start a conversation</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Ask anything about your document. I'll find the relevant sections and answer precisely.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full mt-2">
              {[
                "What is this document about?",
                "Summarize the key points",
                "What are the main conclusions?",
                "List the important findings",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="text-left text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-3 message-enter", msg.role === "user" && "flex-row-reverse")}>
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    msg.role === "user" ? "bg-primary" : "bg-secondary"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="w-3.5 h-3.5 text-primary-foreground" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-foreground" />
                  )}
                </div>
                <div className={cn("flex-1 min-w-0", msg.role === "user" && "flex justify-end")}>
                  <div
                    className={cn(
                      "rounded-xl px-4 py-3 max-w-full",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className={cn("prose prose-sm prose-invert max-w-none", msg.isStreaming && msg.content === "" && "typing-cursor")}>
                        {msg.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        ) : msg.isStreaming ? (
                          <span className="text-muted-foreground text-sm">Thinking...</span>
                        ) : null}
                        {msg.isStreaming && msg.content && <span className="typing-cursor" />}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleSources(msg.id)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <BookOpen className="w-3 h-3" />
                        {expandedSources.has(msg.id) ? "Hide" : "Show"} {msg.sources.length} source
                        {msg.sources.length > 1 ? "s" : ""}
                      </button>
                      {expandedSources.has(msg.id) && (
                        <div className="mt-2 space-y-2">
                          {msg.sources.map((src, i) => (
                            <div
                              key={i}
                              className="bg-secondary/50 border border-border rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {src.page_number ? `Page ${src.page_number}` : `Chunk ${src.chunk_index + 1}`}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(src.similarity * 100)}% match
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-3">{src.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-card border border-border rounded-xl px-4 py-3 focus-within:border-primary/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your document..."
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground max-h-32 overflow-y-auto"
              style={{ fieldSizing: "content" } as React.CSSProperties}
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 h-8 w-8"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
