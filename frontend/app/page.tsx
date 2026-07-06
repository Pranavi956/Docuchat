import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FileText, MessageSquare, Zap, Shield } from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/documents");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">DocuChat</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
          <Zap className="w-3.5 h-3.5" />
          Powered by Gemini 2.0 Flash
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6 max-w-3xl">
          Chat with your documents,{" "}
          <span className="text-primary">instantly</span>
        </h1>
        <p className="text-muted-foreground text-xl mb-10 max-w-xl">
          Upload any PDF and start asking questions. DocuChat uses RAG to find
          precise answers with source citations — no hallucinations.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-up"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors text-lg"
          >
            Start for free
          </Link>
          <Link
            href="/sign-in"
            className="text-muted-foreground hover:text-foreground px-8 py-3 rounded-xl font-semibold transition-colors text-lg border border-border"
          >
            Sign in
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24 max-w-4xl w-full text-left">
          {[
            {
              icon: FileText,
              title: "PDF Upload",
              desc: "Upload any PDF up to 50MB. Text is automatically extracted and indexed.",
            },
            {
              icon: MessageSquare,
              title: "Streaming Chat",
              desc: "Real-time streaming responses with source citations from your document.",
            },
            {
              icon: Shield,
              title: "Private & Secure",
              desc: "Your documents are private. Only you can access your files and conversations.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
