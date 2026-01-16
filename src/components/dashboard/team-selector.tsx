"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, Plus, Check, Settings, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateTeamDialog } from "./create-team-dialog";
import { ManageTeamDialog } from "./manage-team-dialog";
import { getTeams, deleteTeam, type Team } from "@/lib/actions/teams";

interface TeamSelectorProps {
  currentTeam: Team | null;
  onTeamChange: (team: Team) => void;
}

export function TeamSelector({ currentTeam, onTeamChange }: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTeams = useCallback(async () => {
    const result = await getTeams();
    if (result.data) {
      setTeams(result.data);
      // Auto-select first team if none selected
      if (!currentTeam && result.data.length > 0) {
        onTeamChange(result.data[0]);
      }
    }
  }, [currentTeam, onTeamChange]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleTeamSelect = (team: Team) => {
    onTeamChange(team);
  };

  const handleTeamCreated = () => {
    fetchTeams();
  };

  const handleDeleteTeam = async () => {
    if (!currentTeam) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${currentTeam.name}"? This will permanently delete all projects, videos, and documents in this team. This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    const result = await deleteTeam(currentTeam.id);
    setIsDeleting(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    // Refresh teams and select the first available team
    const teamsResult = await getTeams();
    if (teamsResult.data) {
      setTeams(teamsResult.data);
      if (teamsResult.data.length > 0) {
        onTeamChange(teamsResult.data[0]);
      }
    }
  };

  return (
    <>
      <div className="border-b border-border/40 bg-muted/30">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 font-medium">
                {currentTeam ? currentTeam.name : "Select a team"}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {teams.length > 0 ? (
                <>
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => handleTeamSelect(team)}
                      className="flex items-center justify-between"
                    >
                      {team.name}
                      {currentTeam?.id === team.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {currentTeam && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  disabled={isDeleting}
                >
                  <Settings className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Manage Team"}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setIsManageDialogOpen(true)}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Manage Members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteTeam}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <CreateTeamDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTeamCreated={handleTeamCreated}
      />

      {currentTeam && (
        <ManageTeamDialog
          open={isManageDialogOpen}
          onOpenChange={setIsManageDialogOpen}
          team={currentTeam}
        />
      )}
    </>
  );
}
