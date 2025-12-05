"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminHeader from "@/components/admin/admin-header";
import LobbyControl from "@/components/admin/lobby-control";
import WeekProgression from "@/components/admin/week-progression";
import Link from "next/link";
import GameMonitoring from "@/components/admin/game-monitoring";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if admin is logged in
    const adminLoggedIn = localStorage.getItem('adminLoggedIn')
    if (!adminLoggedIn || adminLoggedIn !== 'true') {
      // Not logged in, redirect to login page
      router.push('/admin/login')
    }
  }, [router])

  const handleLogout = async () => {
    // Clear admin session
    localStorage.removeItem('adminLoggedIn')
    localStorage.removeItem('adminUsername')
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
            <p className="text-muted-foreground">Manage lobby, week progression, and live monitoring</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.open('/admin/gameoverview', '_blank')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Game Summary
            </button>
            <Link href="/admin/dashboard">
              <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">
                Go to Gameplay Settings
              </button>
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          {/* Game Lobby Section */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="w-1 h-8 bg-gradient-to-b from-[#E63946] to-[#C1121F] rounded-full"></div>
              <h2 className="text-2xl font-serif font-bold text-gray-900">Game Lobby</h2>
            </div>
            <LobbyControl />
          </section>

          {/* Week Progression Section */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full"></div>
              <h2 className="text-2xl font-serif font-bold text-gray-900">Week Progression</h2>
            </div>
            <WeekProgression />
          </section>

          {/* Live Monitoring Section */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-green-700 rounded-full"></div>
              <h2 className="text-2xl font-serif font-bold text-gray-900">Live Monitoring</h2>
            </div>
            <GameMonitoring gameId="00000000-0000-0000-0000-000000000001" />
          </section>
        </div>
      </div>
    </div>
  );
}
