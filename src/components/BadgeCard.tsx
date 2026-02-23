import { cn } from "@/lib/utils";

interface BadgeCardProps {
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
  size?: "sm" | "md";
}

const BadgeCard = ({ icon, name, description, earned, earnedAt, size = "md" }: BadgeCardProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center rounded-xl border transition-all",
        size === "sm" ? "p-3 gap-1" : "p-4 gap-2",
        earned
          ? "bg-primary/5 border-primary/20 shadow-sm"
          : "bg-muted/30 border-border opacity-50 grayscale"
      )}
    >
      <span className={cn("select-none", size === "sm" ? "text-3xl" : "text-4xl")}>
        {icon}
      </span>
      <p className={cn("font-semibold leading-tight", size === "sm" ? "text-xs" : "text-sm")}>
        {name}
      </p>
      {size === "md" && (
        <p className="text-xs text-muted-foreground leading-snug">{description}</p>
      )}
      {earned && earnedAt && size === "md" && (
        <p className="text-[10px] text-primary font-medium mt-1">
          ✅ Earned {new Date(earnedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default BadgeCard;
