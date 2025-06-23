"use client";

import { MainNav } from "@/components/main-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/user-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
      <footer className="sticky bottom-0 z-50 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center justify-between px-6">
          <div className="flex-1 flex justify-start">
            <ModeToggle />
          </div>
          <div className="flex-1 flex justify-center">
            <MainNav />
          </div>
          <div className="flex-1 flex justify-end">
            <UserNav />
          </div>
        </div>
      </footer>
    </div>
  );
}