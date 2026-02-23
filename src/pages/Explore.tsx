import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Search, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  use_avatar: boolean;
}

interface ChallengeType {
  id: string;
  name: string;
  icon: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  end_date: string;
  start_date: string;
  status: string;
  is_public: boolean;
  challenge_types: ChallengeType;
  profiles: Profile;
}

const Explore = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeTypes, setChallengeTypes] = useState<ChallengeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  useEffect(() => {
    loadChallengeTypes();
    loadChallenges();
  }, []);

  useEffect(() => {
    loadChallenges();
  }, [selectedType, startDate]);

  const loadChallengeTypes = async () => {
    const { data } = await supabase.from("challenge_types").select("*");
    setChallengeTypes(data || []);
  };

  const loadChallenges = async () => {
    setLoading(true);

    let query = supabase
      .from("challenges")
      .select(`
        *,
        challenge_types(id, name, icon),
        profiles(id, display_name, avatar_url, profile_photo_url, use_avatar)
      `)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (selectedType && selectedType !== "all") {
      query = query.eq("type_id", selectedType);
    }

    if (startDate) {
      query = query.gte("start_date", startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading challenges",
        description: error.message,
      });
    } else {
      setChallenges(data as Challenge[] || []);
    }

    setLoading(false);
  };

  const filteredChallenges = challenges.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  const getAvatarSrc = (prof: Profile) => {
    if (prof.use_avatar && prof.avatar_url) return prof.avatar_url;
    if (prof.profile_photo_url) return prof.profile_photo_url;
    return "";
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setStartDate(undefined);
  };

  const hasActiveFilters = searchQuery || selectedType !== "all" || startDate;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-gradient-primary border-b shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Explore</h1>
              <p className="text-sm text-white/80">Discover public challenges</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {challengeTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-muted-foreground">Loading challenges...</p>
          </div>
        ) : filteredChallenges.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No public challenges found matching your filters.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredChallenges.map((challenge) => (
              <Card
                key={challenge.id}
                className="cursor-pointer hover:shadow-elevated transition-all hover:scale-[1.01]"
                onClick={() => navigate(`/challenge/${challenge.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{challenge.challenge_types.icon}</span>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{challenge.title}</CardTitle>
                        <CardDescription className="line-clamp-2 text-sm">
                          {challenge.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={challenge.status === "active" ? "default" : "secondary"} className="flex-shrink-0">
                      {challenge.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={getAvatarSrc(challenge.profiles)} />
                        <AvatarFallback>{challenge.profiles.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">{challenge.profiles.display_name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      Ends {format(new Date(challenge.end_date), "MMM d")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Explore;
