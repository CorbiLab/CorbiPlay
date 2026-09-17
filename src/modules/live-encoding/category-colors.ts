import type { EventCategory, EventType } from "@/types/database";
import {
  Circle,
  Repeat,
  ArrowUpRight,
  Target,
  Flag,
  ShieldHalf,
  AlertTriangle,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Category → colour token (spec §74). Always paired with an icon and label in
 * the UI — colour never carries meaning alone (spec §74/§75).
 */
export const CATEGORY_COLOR_VAR: Record<EventCategory, string> = {
  POSSESSION: "var(--category-possession)",
  TRANSITION: "var(--category-transition)",
  PROGRESSION: "var(--category-progression)",
  ATTACK: "var(--category-attack)",
  PC: "var(--category-pc)",
  DEFENCE: "var(--category-defence)",
  DISCIPLINE: "var(--category-danger)",
  SUBSTITUTION: "var(--category-defence)",
  PRESS: "var(--category-press)",
};

/** French label, paired with the colour above wherever a category is shown as its own group (spec §74/§75). */
export const CATEGORY_LABEL: Record<EventCategory, string> = {
  POSSESSION: "Possession",
  TRANSITION: "Transition",
  PROGRESSION: "Progression",
  ATTACK: "Attaque",
  PC: "Coup de coin",
  DEFENCE: "Défense",
  DISCIPLINE: "Discipline",
  SUBSTITUTION: "Remplacement",
  PRESS: "Presse",
};

/** Icon, paired with the colour/label above — never colour alone (spec §74/§75). */
export const CATEGORY_ICON: Record<EventCategory, LucideIcon> = {
  POSSESSION: Circle,
  TRANSITION: Repeat,
  PROGRESSION: ArrowUpRight,
  ATTACK: Target,
  PC: Flag,
  DEFENCE: ShieldHalf,
  DISCIPLINE: AlertTriangle,
  SUBSTITUTION: Users,
  PRESS: Zap,
};

interface ButtonColorClass {
  /** The icon's own small chip — background + text, so it reads as a colour
      swatch even before the label is read. */
  chip: string;
  /** Idle button border/background. */
  idle: string;
  /** Selected/active button border/background — same hue, stronger. */
  active: string;
}

/**
 * Full literal Tailwind class strings (not built from the CSS-var map above)
 * — Tailwind's scanner needs the class name to appear verbatim in source, so
 * these can't be assembled at runtime from `CATEGORY_COLOR_VAR`. Idle
 * background/border are deliberately more saturated than a first pass at
 * this (bg/10, border/30) — an analyst scanning 25 buttons mid-match needs
 * the colour to register without reading the label first.
 */
export const CATEGORY_BUTTON_CLASS: Record<EventCategory, ButtonColorClass> = {
  POSSESSION: {
    chip: "bg-category-possession/20 text-category-possession",
    idle: "border-category-possession/50 bg-category-possession/8 hover:bg-category-possession/15",
    active: "border-category-possession bg-category-possession/30",
  },
  TRANSITION: {
    chip: "bg-category-transition/20 text-category-transition",
    idle: "border-category-transition/50 bg-category-transition/8 hover:bg-category-transition/15",
    active: "border-category-transition bg-category-transition/30",
  },
  PROGRESSION: {
    chip: "bg-category-progression/20 text-category-progression",
    idle: "border-category-progression/50 bg-category-progression/8 hover:bg-category-progression/15",
    active: "border-category-progression bg-category-progression/30",
  },
  ATTACK: {
    chip: "bg-category-attack/20 text-category-attack",
    idle: "border-category-attack/50 bg-category-attack/8 hover:bg-category-attack/15",
    active: "border-category-attack bg-category-attack/30",
  },
  PC: {
    chip: "bg-category-pc/20 text-category-pc",
    idle: "border-category-pc/50 bg-category-pc/8 hover:bg-category-pc/15",
    active: "border-category-pc bg-category-pc/30",
  },
  DEFENCE: {
    chip: "bg-category-defence/20 text-category-defence",
    idle: "border-category-defence/50 bg-category-defence/8 hover:bg-category-defence/15",
    active: "border-category-defence bg-category-defence/30",
  },
  DISCIPLINE: {
    chip: "bg-category-danger/20 text-category-danger",
    idle: "border-category-danger/50 bg-category-danger/8 hover:bg-category-danger/15",
    active: "border-category-danger bg-category-danger/30",
  },
  SUBSTITUTION: {
    chip: "bg-category-defence/20 text-category-defence",
    idle: "border-category-defence/50 bg-category-defence/8 hover:bg-category-defence/15",
    active: "border-category-defence bg-category-defence/30",
  },
  PRESS: {
    chip: "bg-category-press/20 text-category-press",
    idle: "border-category-press/50 bg-category-press/8 hover:bg-category-press/15",
    active: "border-category-press bg-category-press/30",
  },
};

/**
 * GREEN_CARD/YELLOW_CARD/RED_CARD get their own literal colour instead of
 * sharing DISCIPLINE's red with FOUL — a green card rendered in the same red
 * as everything else in the category is actively misleading at a glance,
 * which is the one thing this colour system exists to prevent (spec
 * §74/§75). Anything not listed here falls back to its category's class.
 */
export const EVENT_TYPE_BUTTON_CLASS_OVERRIDE: Partial<Record<EventType, ButtonColorClass>> = {
  GREEN_CARD: {
    chip: "bg-card-green/20 text-card-green",
    idle: "border-card-green/50 bg-card-green/8 hover:bg-card-green/15",
    active: "border-card-green bg-card-green/30",
  },
  YELLOW_CARD: {
    chip: "bg-card-yellow/25 text-card-yellow",
    idle: "border-card-yellow/60 bg-card-yellow/10 hover:bg-card-yellow/20",
    active: "border-card-yellow bg-card-yellow/35",
  },
  RED_CARD: {
    chip: "bg-card-red/20 text-card-red",
    idle: "border-card-red/50 bg-card-red/8 hover:bg-card-red/15",
    active: "border-card-red bg-card-red/30",
  },
};
