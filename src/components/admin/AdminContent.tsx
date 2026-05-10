import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePagination } from "@/hooks/usePagination";
import ShowMoreButton from "@/components/ShowMoreButton";

interface ChallengeRow {
  id: string;
  title: string;
  description: string;
  status: string;
  is_public: boolean;
  created_at: string;
  profiles: { display_name: string; email: string };
}

const STATUS_OPTIONS = ["all", "active", "under_review", "removed", "upcoming", "finished"];

const AdminContent = () => {
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { visibleItems, hasMore, showMore, totalCount, visibleCount, reset } = usePagination(challenges, { pageSize: 20 });

  const loadContent = async () => {
    setLoading(true);
    let query = supabase
      .from("challenges")
      .select("id, title, description, status, is_public, created_at, profiles!challenges_owner_id_fkey(display_name, email)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setChallenges((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { reset(); loadContent(); }, [filter]);

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("challenges").update({ status }).eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    } else {
      toast({ title: `Status updated to ${status}` });
      loadContent();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } else {
      toast({ title: "Challenge deleted" });
      loadContent();
    }
  };

  const statusBadgeVariant = (s: string) => {
    if (s === "active") return "default";
    if (s === "under_review") return "destructive";
    if (s === "removed") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All" : s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading content...</p>
      ) : challenges.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-8 text-center text-muted-foreground">No challenges found.</CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{totalCount} challenges total</p>
          {visibleItems.map((c) => (
            <Card key={c.id} className="shadow-card">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{c.title}</span>
                      <Badge variant={statusBadgeVariant(c.status)} className="text-xs shrink-0">
                        {c.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      By {c.profiles.display_name} · {format(new Date(c.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Select onValueChange={(v) => handleStatusChange(c.id, v)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="removed">Removed</SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="text-xs h-8">Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{c.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>This permanently deletes the challenge and all associated data.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {hasMore && <ShowMoreButton onClick={showMore} visibleCount={visibleCount} totalCount={totalCount} />}
        </>
      )}
    </div>
  );
};

export default AdminContent;
