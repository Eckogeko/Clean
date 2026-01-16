"use client";

import { useState, useCallback, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { TeamSelector } from "./team-selector";
import { ProjectGrid } from "./project-grid";
import { type Team } from "@/lib/actions/teams";
import { getCurrentUserRole } from "@/lib/actions/team-members";

export function DashboardShell() {
  const { user } = useUser();
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [userRole, setUserRole] = useState<"owner" | "director" | "dancer" | null>(null);

  const handleTeamChange = useCallback((team: Team) => {
    setCurrentTeam(team);
  }, []);

  // Fetch user's role when team changes
  useEffect(() => {
    async function fetchRole() {
      if (currentTeam) {
        const result = await getCurrentUserRole(currentTeam.id);
        setUserRole(result.role);
      } else {
        setUserRole(null);
      }
    }
    fetchRole();
  }, [currentTeam]);

  // Owners and directors can edit, only owners can delete
  const canEdit = userRole === "owner" || userRole === "director";
  const canDelete = userRole === "owner";

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
            <span className="text-xl font-semibold">Clean</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              Hello, {user?.firstName || "User"}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      {/* Team Selector Bar */}
      <div className="fixed top-16 z-40 w-full">
        <TeamSelector
          currentTeam={currentTeam}
          onTeamChange={handleTeamChange}
        />
      </div>

      {/* Main Content */}
      <main className="pt-32 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          <ProjectGrid teamId={currentTeam?.id ?? null} canEdit={canEdit} canDelete={canDelete} />
        </div>
      </main>
    </div>
  );
}
