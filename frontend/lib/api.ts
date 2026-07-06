const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(
  path: string,
  token: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }

  return res;
}

export async function uploadDocument(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/documents/upload", token, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function listDocuments(token: string) {
  const res = await apiFetch("/api/documents/", token);
  return res.json();
}

export async function deleteDocument(documentId: string, token: string) {
  await apiFetch(`/api/documents/${documentId}`, token, { method: "DELETE" });
}

export async function getDocument(documentId: string, token: string) {
  const res = await apiFetch(`/api/documents/${documentId}`, token);
  return res.json();
}

export async function getChatHistory(documentId: string, token: string) {
  const res = await apiFetch(`/api/chat/history/${documentId}`, token);
  return res.json();
}

export async function clearChatHistory(documentId: string, token: string) {
  await apiFetch(`/api/chat/history/${documentId}`, token, { method: "DELETE" });
}

export function streamChat(
  documentId: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  token: string,
  onToken: (text: string) => void,
  onSources: (sources: unknown[]) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: documentId,
          message,
          conversation_history: conversationHistory,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Stream error" }));
        onError(err.detail || "Failed to start stream");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "sources") onSources(data.sources);
              else if (data.type === "token") onToken(data.content);
              else if (data.type === "done") onDone();
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        onError((err as Error).message);
      }
    }
  })();

  return () => controller.abort();
}
