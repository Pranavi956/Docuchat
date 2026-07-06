"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ChatInterface } from "@/components/chat-interface";
import { Toaster } from "@/components/ui/toaster";
import { getDocument } from "@/lib/api";

interface Document {
  id: string;
  filename: string;
  status: string;
}

export default function ChatPage({
  params,
}: {
  params: { documentId: string };
}) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDoc() {
      try {
        const token = await getToken();
        if (!token) return;
        const doc = await getDocument(params.documentId, token);
        setDocument(doc);
      } catch {
        router.push("/documents");
      } finally {
        setIsLoading(false);
      }
    }
    loadDoc();
  }, [params.documentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document) return null;

  return (
    <>
      <Toaster />
      <ChatInterface documentId={document.id} documentName={document.filename} />
    </>
  );
}
