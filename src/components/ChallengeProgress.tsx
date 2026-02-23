import { useState, useMemo } from "react";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, startOfWeek, startOfMonth, endOfWeek, endOfMonth, endOfDay, isWithinInterval, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";

interface Proof {
  id: string;
  created_at: string;
  text: string | null;
  quantity_value: number | null;
  participation_id: string;
}

interface ChallengeProgressProps {
  challengeType: string;
  quantityTarget: number | null;
  frequencyQuantity: number | null;
  frequencyPeriod: string | null;
  startDate: string;
  endDate: string;
  myProofs: Proof[];
  isParticipant: boolean;
  onSubmitProof: (periodLabel?: string) => void;
  onViewProof: (proofId: string) => void;
}

const ChallengeProgress = ({
  challengeType,
  quantityTarget,
  frequencyQuantity,
  frequencyPeriod,
  startDate,
  endDate,
  myProofs,
  isParticipant,
  onSubmitProof,
  onViewProof,
}: ChallengeProgressProps) => {
  if (challengeType === "Quantity" && quantityTarget) {
    return (
      <QuantityProgress
        target={quantityTarget}
        proofs={myProofs}
        isParticipant={isParticipant}
        onSubmitProof={onSubmitProof}
        onViewProof={onViewProof}
      />
    );
  }

  if (challengeType === "Frequency" && frequencyQuantity && frequencyPeriod) {
    return (
      <FrequencyProgress
        quantity={frequencyQuantity}
        period={frequencyPeriod}
        startDate={startDate}
        endDate={endDate}
        proofs={myProofs}
        isParticipant={isParticipant}
        onSubmitProof={onSubmitProof}
        onViewProof={onViewProof}
      />
    );
  }

  return null;
};

// ─── Quantity Progress ───
const QuantityProgress = ({
  target,
  proofs,
  isParticipant,
  onSubmitProof,
  onViewProof,
}: {
  target: number;
  proofs: Proof[];
  isParticipant: boolean;
  onSubmitProof: () => void;
  onViewProof: (id: string) => void;
}) => {
  const completed = proofs.length;
  const bubbles = Array.from({ length: target }, (_, i) => i);

  return (
    <Card className="shadow-card border-accent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>📊 Progress</span>
          <Badge variant={completed >= target ? "default" : "secondary"}>
            {completed}/{target}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {bubbles.map((i) => {
            const proof = proofs[i];
            const isDone = !!proof;
            return (
              <button
                key={i}
                onClick={() => {
                  if (isDone) {
                    onViewProof(proof.id);
                  } else if (isParticipant) {
                    onSubmitProof();
                  }
                }}
                className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  isDone
                    ? "bg-primary text-primary-foreground border-primary"
                    : isParticipant
                    ? "border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary cursor-pointer"
                    : "border-muted text-muted-foreground/30"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Frequency Progress ───
interface Period {
  label: string;
  start: Date;
  end: Date;
  requiredCount: number;
}

const FrequencyProgress = ({
  quantity,
  period,
  startDate,
  endDate,
  proofs,
  isParticipant,
  onSubmitProof,
  onViewProof,
}: {
  quantity: number;
  period: string;
  startDate: string;
  endDate: string;
  proofs: Proof[];
  isParticipant: boolean;
  onSubmitProof: (periodLabel?: string) => void;
  onViewProof: (id: string) => void;
}) => {
  const periods = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const result: Period[] = [];

    if (period === "day") {
      const days = eachDayOfInterval({ start, end });
      days.forEach((d) => {
        result.push({
          label: format(d, "MMM d"),
          start: startOfDay(d),
          end: endOfDay(d),
          requiredCount: quantity,
        });
      });
    } else if (period === "week") {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      weeks.forEach((w, i) => {
        const wEnd = endOfWeek(w, { weekStartsOn: 1 });
        result.push({
          label: `Week ${i + 1} (${format(w, "MMM d")})`,
          start: w < start ? start : w,
          end: wEnd > end ? end : wEnd,
          requiredCount: quantity,
        });
      });
    } else if (period === "month") {
      const months = eachMonthOfInterval({ start, end });
      months.forEach((m) => {
        const mEnd = endOfMonth(m);
        result.push({
          label: format(m, "MMMM yyyy"),
          start: m < start ? start : m,
          end: mEnd > end ? end : mEnd,
          requiredCount: quantity,
        });
      });
    } else if (period === "year") {
      // Simple: group by year
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      for (let y = startYear; y <= endYear; y++) {
        const yStart = new Date(y, 0, 1);
        const yEnd = new Date(y, 11, 31, 23, 59, 59);
        result.push({
          label: `${y}`,
          start: yStart < start ? start : yStart,
          end: yEnd > end ? end : yEnd,
          requiredCount: quantity,
        });
      }
    }

    return result;
  }, [startDate, endDate, period, quantity]);

  const now = new Date();

  return (
    <Card className="shadow-card border-accent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          📅 Frequency: {quantity}x {period === "day" ? "daily" : `per ${period}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {periods.map((p, idx) => {
          const periodProofs = proofs.filter((pr) => {
            const d = new Date(pr.created_at);
            return isWithinInterval(d, { start: p.start, end: p.end });
          });
          const isComplete = periodProofs.length >= p.requiredCount;
          const isPast = isBefore(p.end, now);
          const isCurrent = isWithinInterval(now, { start: p.start, end: p.end });
          const isFuture = !isPast && !isCurrent;

          if (isFuture) return null; // hide future periods

          return (
            <PeriodRow
              key={idx}
              period={p}
              periodProofs={periodProofs}
              isComplete={isComplete}
              isPast={isPast}
              isCurrent={isCurrent}
              isParticipant={isParticipant}
              onSubmitProof={() => onSubmitProof(p.label)}
              onViewProof={onViewProof}
            />
          );
        })}
      </CardContent>
    </Card>
  );
};

const PeriodRow = ({
  period,
  periodProofs,
  isComplete,
  isPast,
  isCurrent,
  isParticipant,
  onSubmitProof,
  onViewProof,
}: {
  period: Period;
  periodProofs: Proof[];
  isComplete: boolean;
  isPast: boolean;
  isCurrent: boolean;
  isParticipant: boolean;
  onSubmitProof: () => void;
  onViewProof: (id: string) => void;
}) => {
  const [open, setOpen] = useState(isCurrent);

  if (isComplete && isPast) {
    // Collapsed completed period
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 p-2 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors text-left">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium flex-1">{period.label}</span>
            <Badge variant="default" className="text-xs">
              {periodProofs.length}/{period.requiredCount} ✓
            </Badge>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-10 pt-1 space-y-1">
          {periodProofs.map((pr) => (
            <button
              key={pr.id}
              onClick={() => onViewProof(pr.id)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors block"
            >
              • {pr.text?.slice(0, 40) || "Proof"} — {format(new Date(pr.created_at), "MMM d, h:mm a")}
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Current or incomplete past period — expanded
  const slots = Array.from({ length: period.requiredCount }, (_, i) => i);

  return (
    <div className={`p-3 rounded-lg border ${isCurrent ? "border-primary/30 bg-primary/5" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{period.label}</span>
        <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
          {periodProofs.length}/{period.requiredCount}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {slots.map((i) => {
          const proof = periodProofs[i];
          const isDone = !!proof;
          return (
            <button
              key={i}
              onClick={() => {
                if (isDone) onViewProof(proof.id);
                else if (isParticipant && isCurrent) onSubmitProof();
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-all ${
                isDone
                  ? "bg-primary/10 border-primary text-primary cursor-pointer"
                  : isParticipant && isCurrent
                  ? "border-dashed border-muted-foreground/40 hover:border-primary hover:text-primary cursor-pointer"
                  : "border-muted text-muted-foreground/30"
              }`}
            >
              <Checkbox checked={isDone} className="h-3 w-3 pointer-events-none" />
              {isDone ? "Done" : `#${i + 1}`}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChallengeProgress;
