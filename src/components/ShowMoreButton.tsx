import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface ShowMoreButtonProps {
  onClick: () => void;
  visibleCount: number;
  totalCount: number;
}

const ShowMoreButton = ({ onClick, visibleCount, totalCount }: ShowMoreButtonProps) => (
  <div className="flex flex-col items-center gap-1 pt-2">
    <Button variant="ghost" size="sm" onClick={onClick} className="gap-1 text-muted-foreground">
      <ChevronDown className="h-4 w-4" />
      Show more
    </Button>
    <span className="text-xs text-muted-foreground">
      Showing {visibleCount} of {totalCount}
    </span>
  </div>
);

export default ShowMoreButton;
