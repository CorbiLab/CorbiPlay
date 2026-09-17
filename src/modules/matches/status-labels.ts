import type { MatchStatus } from "@/types/database";

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Programmé",
  LIVE: "En direct",
  BREAK: "Pause",
  WARMUP: "Échauffement",
  FINISHED: "Terminé",
};

export const MATCH_STATUS_VARIANT: Record<MatchStatus, "default" | "secondary" | "outline"> = {
  SCHEDULED: "outline",
  LIVE: "default",
  BREAK: "default",
  WARMUP: "outline",
  FINISHED: "secondary",
};
