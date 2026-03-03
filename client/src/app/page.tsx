'use client'

import { useSocket } from "@/lib/socket";

export default function DashboardPage() {
  const { socket } = useSocket();

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome to your dashboard.
      </p>
    </div>
  );
}
