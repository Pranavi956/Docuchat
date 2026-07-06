"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-3.5 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="flex items-center gap-6">
          <Link href="/documents" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold">DocuChat</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/documents"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                pathname === "/documents"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Documents
            </Link>
          </nav>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
