"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminHeader from "@/components/admin/admin-header";
import LobbyControl from "@/components/admin/lobby-control";
import WeekProgression from "@/components/admin/week-progression";
import Link from "next/link";
import GameMonitoring from "@/components/admin/game-monitoring";

type TabType = "lobby" | "week" | "monitoring";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("lobby");

  const handleLogout = async () => {
    sessionStorage.removeItem("current_game_id");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-serif font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage lobby and week progression</p>
          </div>
          <Link href="/admin/dashboard">
            <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">
              Go to Gameplay Settings
            </button>
          </Link>
        </div>

        <div className="flex border-b border-border mb-8 overflow-x-auto">
          {(["lobby", "week", "monitoring"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "lobby" && "Game Lobby"}
              {tab === "week" && "Week Progression"}
              {tab === "monitoring" && "Live Monitoring"}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === "lobby" && <LobbyControl />}
          {activeTab === "week" && <WeekProgression />}
          {activeTab === "monitoring" && <GameMonitoring gameId="00000000-0000-0000-0000-000000000001" />}
        </div>
      </div>
    </div>
  );
}
