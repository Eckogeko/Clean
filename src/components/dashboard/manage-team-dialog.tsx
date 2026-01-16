"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getTeamMembers,
  inviteMemberByEmail,
  inviteMemberByUserId,
  updateMemberRole,
  removeMember,
  searchUsers,
  getCurrentUserRole,
  type TeamMemberWithUser,
  type UserInfo,
} from "@/lib/actions/team-members";
import { type Team } from "@/lib/actions/teams";
import { Crown, Trash2, UserPlus, Search, Mail, Shield } from "lucide-react";

interface ManageTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
}

export function ManageTeamDialog({
  open,
  onOpenChange,
  team,
}: ManageTeamDialogProps) {
  const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<"owner" | "director" | "dancer" | null>(null);

  // Invite by email state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"director" | "dancer">("dancer");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Search users state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    const [membersResult, roleResult] = await Promise.all([
      getTeamMembers(team.id),
      getCurrentUserRole(team.id),
    ]);

    if (membersResult.data) {
      setMembers(membersResult.data);
    }
    if (roleResult.role) {
      setCurrentUserRole(roleResult.role);
    }
    setIsLoading(false);
  }, [team.id]);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, fetchMembers]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const result = await searchUsers(query);
    if (result.data) {
      // Filter out users who are already members
      const memberUserIds = members.map((m) => m.user_id);
      setSearchResults(result.data.filter((u) => !memberUserIds.includes(u.id)));
    }
    setIsSearching(false);
  }, [members]);

  const handleInviteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError(null);

    const result = await inviteMemberByEmail(team.id, inviteEmail, inviteRole);

    if (result.error) {
      setInviteError(result.error);
      setIsInviting(false);
      return;
    }

    setInviteEmail("");
    setInviteRole("dancer");
    setIsInviting(false);
    fetchMembers();
  };

  const handleInviteUser = async (user: UserInfo) => {
    setIsInviting(true);
    setInviteError(null);

    const result = await inviteMemberByUserId(team.id, user.id, inviteRole);

    if (result.error) {
      setInviteError(result.error);
      setIsInviting(false);
      return;
    }

    setSelectedUser(null);
    setSearchQuery("");
    setSearchResults([]);
    setIsInviting(false);
    fetchMembers();
  };

  const handleRoleChange = async (memberId: string, newRole: "director" | "dancer") => {
    const result = await updateMemberRole(team.id, memberId, newRole);
    if (!result.error) {
      fetchMembers();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const result = await removeMember(team.id, memberId);
    if (!result.error) {
      fetchMembers();
    }
  };

  const isOwner = currentUserRole === "owner";
  const isDirector = currentUserRole === "director";
  const canInvite = isOwner || isDirector;

  const getInitials = (member: TeamMemberWithUser) => {
    if (member.user?.first_name && member.user?.last_name) {
      return `${member.user.first_name[0]}${member.user.last_name[0]}`.toUpperCase();
    }
    if (member.email) {
      return member.email[0].toUpperCase();
    }
    return "?";
  };

  const getMemberName = (member: TeamMemberWithUser) => {
    if (member.user?.first_name || member.user?.last_name) {
      return `${member.user.first_name || ""} ${member.user.last_name || ""}`.trim();
    }
    return member.email || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Team</DialogTitle>
          <DialogDescription>
            View and manage members of {team.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="members" className="mt-4">
          <TabsList className={`grid w-full ${canInvite ? "grid-cols-2" : "grid-cols-1"}`}>
            <TabsTrigger value="members">Members</TabsTrigger>
            {canInvite && <TabsTrigger value="invite">Invite</TabsTrigger>}
          </TabsList>

          <TabsContent value="members" className="mt-4">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading members...
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {getMemberName(member)}
                          </span>
                          {member.role === "owner" && (
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          {member.role === "director" && (
                            <Shield className="h-3.5 w-3.5 text-blue-500" />
                          )}
                        </div>
                        {member.email && (
                          <span className="text-xs text-muted-foreground">
                            {member.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Show role management for owners, or just role badge for others */}
                    {member.role === "owner" ? (
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                        Owner
                      </span>
                    ) : isOwner ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(value: "director" | "dancer") =>
                            handleRoleChange(member.id, value)
                          }
                        >
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="director">Director</SelectItem>
                            <SelectItem value="dancer">Dancer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : isDirector && member.role === "dancer" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded capitalize">
                          {member.role}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded capitalize">
                        {member.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {canInvite && (
            <TabsContent value="invite" className="mt-4">
              <Tabs defaultValue="email">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="h-4 w-4" />
                    By Email
                  </TabsTrigger>
                  <TabsTrigger value="search" className="gap-2">
                    <Search className="h-4 w-4" />
                    Search Users
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email">
                  <form onSubmit={handleInviteByEmail} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="member@example.com"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(value: "director" | "dancer") =>
                          setInviteRole(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dancer">Dancer</SelectItem>
                          {isOwner && (
                            <SelectItem value="director">Director</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {!isOwner && (
                        <p className="text-xs text-muted-foreground">
                          Only owners can assign the director role
                        </p>
                      )}
                    </div>
                    {inviteError && (
                      <p className="text-sm text-destructive">{inviteError}</p>
                    )}
                    <Button
                      type="submit"
                      disabled={isInviting || !inviteEmail.trim()}
                      className="w-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {isInviting ? "Inviting..." : "Invite Member"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="search">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="search">Search by name or email</Label>
                      <Input
                        id="search"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Start typing to search..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Role for invited member</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(value: "director" | "dancer") =>
                          setInviteRole(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dancer">Dancer</SelectItem>
                          {isOwner && (
                            <SelectItem value="director">Director</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {!isOwner && (
                        <p className="text-xs text-muted-foreground">
                          Only owners can assign the director role
                        </p>
                      )}
                    </div>
                    {inviteError && (
                      <p className="text-sm text-destructive">{inviteError}</p>
                    )}
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {isSearching ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          Searching...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {user.first_name?.[0] || user.email?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="text-sm font-medium">
                                  {user.first_name} {user.last_name}
                                </span>
                                {user.email && (
                                  <p className="text-xs text-muted-foreground">
                                    {user.email}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInviteUser(user)}
                              disabled={isInviting}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : searchQuery.length >= 2 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No users found
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          Type at least 2 characters to search
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
