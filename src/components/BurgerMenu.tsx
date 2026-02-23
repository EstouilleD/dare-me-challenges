import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Menu, User, Swords, PlusCircle, Trash2, Trophy, Settings, LogOut, Compass, Award } from "lucide-react";
import { useState } from "react";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
}

interface BurgerMenuProps {
  profile: Profile;
}

const BurgerMenu = ({ profile }: BurgerMenuProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const getAvatarSrc = () => {
    if (profile.use_avatar && profile.avatar_url) return profile.avatar_url;
    if (profile.profile_photo_url) return profile.profile_photo_url;
    return "";
  };

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const menuItems = [
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Compass, label: "Explore", path: "/explore" },
    { icon: Swords, label: "My Challenges", path: "/my-challenges" },
    { icon: PlusCircle, label: "Challenges Created", path: "/created-challenges" },
    { icon: Trash2, label: "Deleted Challenges", path: "/deleted-challenges" },
    { icon: Trophy, label: "Old Challenges", path: "/challenge-history" },
    { icon: Award, label: "Badges", path: "/badges" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white">
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage src={getAvatarSrc()} />
              <AvatarFallback>{profile.display_name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <SheetTitle className="text-left truncate">{profile.display_name}</SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <nav className="flex flex-col py-2">
          {menuItems.map((item) => (
            <button
              key={item.path + item.label}
              onClick={() => handleNavigate(item.path)}
              className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              {item.label}
            </button>
          ))}
        </nav>

        <Separator />

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left mt-2"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </SheetContent>
    </Sheet>
  );
};

export default BurgerMenu;
