import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface DeletedUser {
  id: string;
  original_user_id: string;
  email: string;
  display_name: string;
  full_name: string | null;
  deletion_reason: string | null;
  deleted_at: string;
  created_at: string | null;
}

const AdminDeletedUsers = () => {
  const [users, setUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("deleted_users")
        .select("*")
        .order("deleted_at", { ascending: false });
      setUsers((data as any) || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading deleted users...</p>;

  if (users.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          No deleted users.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <Card key={u.id} className="shadow-card">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{u.display_name}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">Deleted</Badge>
                  <span>Deleted {format(new Date(u.deleted_at), "MMM d, yyyy HH:mm")}</span>
                  {u.deletion_reason && <span>· {u.deletion_reason}</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminDeletedUsers;
