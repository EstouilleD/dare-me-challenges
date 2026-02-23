import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserRow {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean | null;
  account_status: string;
  reportCount: number;
  roles: string[];
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email, avatar_url, profile_photo_url, use_avatar, account_status")
      .order("created_at", { ascending: true });

    if (!profiles) { setLoading(false); return; }

    // Get report counts per challenge owner
    const { data: reports } = await supabase
      .from("reports")
      .select("challenge_id, challenges!inner(owner_id)");

    const reportCounts: Record<string, number> = {};
    (reports as any)?.forEach((r: any) => {
      const ownerId = r.challenges.owner_id;
      reportCounts[ownerId] = (reportCounts[ownerId] || 0) + 1;
    });

    // Get roles
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap: Record<string, string[]> = {};
    roles?.forEach((r) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    setUsers(
      profiles.map((p) => ({
        ...p,
        account_status: (p as any).account_status ?? "active",
        reportCount: reportCounts[p.id] || 0,
        roles: roleMap[p.id] || [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleStatusChange = async (userId: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", userId);
    if (error) {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    } else {
      toast({ title: `User ${status}` });
      loadUsers();
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Remove existing roles, then insert new one
    await supabase.from("user_roles").delete().eq("user_id", userId);
    if (newRole !== "none") {
      await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    }
    toast({ title: "Role updated" });
    loadUsers();
  };

  const getAvatar = (u: UserRow) => {
    if (u.use_avatar && u.avatar_url) return u.avatar_url;
    if (u.profile_photo_url) return u.profile_photo_url;
    return "";
  };

  const statusColor = (s: string) => {
    if (s === "banned") return "destructive";
    if (s === "suspended") return "secondary";
    return "default";
  };

  if (loading) return <p className="text-muted-foreground">Loading users...</p>;

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <Card key={u.id} className="shadow-card">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={getAvatar(u)} />
                  <AvatarFallback>{u.display_name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.display_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={statusColor(u.account_status)} className="text-xs">
                      {u.account_status}
                    </Badge>
                    {u.roles.map((r) => (
                      <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                    ))}
                    {u.reportCount > 0 && (
                      <span className="text-xs text-destructive font-medium">{u.reportCount} report{u.reportCount > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Select defaultValue={u.roles[0] || "none"} onValueChange={(v) => handleRoleChange(u.id, v)}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No role</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {u.account_status !== "suspended" && (
                  <Button size="sm" variant="secondary" className="text-xs h-8" onClick={() => handleStatusChange(u.id, "suspended")}>
                    Suspend
                  </Button>
                )}
                {u.account_status !== "banned" && (
                  <Button size="sm" variant="destructive" className="text-xs h-8" onClick={() => handleStatusChange(u.id, "banned")}>
                    Ban
                  </Button>
                )}
                {u.account_status !== "active" && (
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleStatusChange(u.id, "active")}>
                    Activate
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminUsers;
