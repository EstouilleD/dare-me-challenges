import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { getAvatarSrc } from "@/lib/avatars";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
}

interface PostFeedItemProps {
  post: {
    id: string;
    text: string;
    created_at: string;
    user_id: string;
    profiles: Profile;
  };
  currentUserId: string;
  onRefresh: () => void;
}

// getAvatarSrc imported from @/lib/avatars

const PostFeedItem = ({ post, currentUserId, onRefresh }: PostFeedItemProps) => {
  const { toast } = useToast();
  const isAuthor = currentUserId === post.user_id;

  const handleDelete = async () => {
    const { error } = await supabase.from("challenge_posts").delete().eq("id", post.id);
    if (error) {
      toast({ variant: "destructive", title: "Failed to delete post", description: error.message });
    } else {
      toast({ title: "Post deleted" });
      onRefresh();
    }
  };

  return (
    <Card className="shadow-card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <Avatar className="h-9 w-9 mt-0.5">
          <AvatarImage src={getAvatarSrc(post.profiles)} />
          <AvatarFallback>{post.profiles.display_name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{post.profiles.display_name}</p>
            <span className="text-xs text-muted-foreground">
              {format(new Date(post.created_at), "MMM d 'at' h:mm a")}
            </span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{post.text}</p>
        </div>
        {isAuthor && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );
};

export default PostFeedItem;
