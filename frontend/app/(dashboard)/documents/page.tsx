"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Plus } from "lucide-react";
import { DocumentUpload } from "@/components/document-upload";
import { DocumentList } from "@/components/document-list";
import { Toaster } from "@/components/ui/toaster";
import { listDocuments } from "@/lib/api";

interface Document {
  id: string;
  filename: string;
  file_size: number;
  page_count: number | null;
  status: string;
  created_at: string;
}

export default function DocumentsPage() {
  const { getToken } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  async function fetchDocuments() {
    try {
      const token = await getToken();
      if (!token) return;
      const docs = await listDocuments(token);
      setDocuments(docs);
      if (docs.length === 0) setShowUpload(true);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Toaster />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        {documents.length > 0 && (
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Upload PDF
          </button>
        )}
      </div>

      {(showUpload || documents.length === 0) && (
        <div className="mb-8">
          <DocumentUpload
            onUploadSuccess={() => {
              fetchDocuments();
              setShowUpload(false);
            }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DocumentList
          documents={documents}
          onDelete={(id) => setDocuments((prev) => prev.filter((d) => d.id !== id))}
        />
      )}
    </div>
  );
}
