import type { AttendanceStatus, TrainingSessionType } from "@/types/database";

export const TRAINING_SESSION_TYPE_LABEL: Record<TrainingSessionType, string> = {
  RECOVERY: "Récupération",
  TECHNICAL: "Technique",
  TACTICAL: "Tactique",
  CONDITIONING: "Physique",
  GYM: "Salle",
  MATCH_PREP: "Préparation match",
  OTHER: "Autre",
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PLANNED: "Prévu",
  PRESENT: "Présent",
  ABSENT: "Absent",
  INJURED: "Blessé",
  REHAB: "Réathlétisation",
  MODIFIED: "Aménagé",
};

export const ATTENDANCE_STATUS_BADGE_CLASS: Record<AttendanceStatus, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  PRESENT: "bg-category-possession/20 text-category-possession",
  ABSENT: "bg-category-danger/20 text-category-danger",
  INJURED: "bg-category-danger/20 text-category-danger",
  REHAB: "bg-category-attack/20 text-category-attack",
  MODIFIED: "bg-category-attack/20 text-category-attack",
};
