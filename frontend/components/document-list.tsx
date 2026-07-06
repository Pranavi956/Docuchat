"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  FileText,
  MessageSquare,
  Trash2,
  Loader2,
  FileWarning,
  Calendar,
  BookOpen,
} from "lucide-react";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { deleteDocument } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Document {
  id: string;
  filename: string;
  file_size: number;
  page_count: number | null;
  status: string;
  created_at: string;
}

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  const { getToken } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, docId: string, filename: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete "${filename}"? This will also delete all chat history.`)) return;

    setDeletingId(docId);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await deleteDocument(docId, token);
      onDelete(docId);
      toast({ title: "Document deleted", description: filename });
    } catch (err: unknown) {
      toast({
        title: "Delete failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <FileWarning className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No documents yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Upload your first PDF to start chatting with it.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <Link
          key={doc.id}
          href={`/chat/${doc.id}`}
          className={cn(
            "group relative bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-card/80 transition-all",
            deletingId === doc.id && "pointer-events-none opacity-50"
          )}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <button
              onClick={(e) => handleDelete(e, doc.id, doc.filename)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
              disabled={deletingId === doc.id}
            >
              {deletingId === doc.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>

          <h3 className="font-medium text-sm line-clamp-2 mb-3" title={doc.filename}>
            {doc.filename}
          </h3>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {doc.page_count ? `${doc.page_count} pages` : formatBytes(doc.file_size)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(doc.created_at)}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                doc.status === "ready"
                  ? "bg-green-500/10 text-green-500"
                  : "bg-yellow-500/10 text-yellow-500"
              )}
            >
              {doc.status}
            </span>
            <span className="flex items-center gap-1 text-xs text-primary font-medium">
              <MessageSquare className="w-3 h-3" />
              Chat
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
