import {
  LayoutDashboard,
  Swords,
  LineChart,
  Dumbbell,
  Users,
  Gauge,
  Satellite,
  Building2,
  Shield,
  UserRound,
  Wifi,
  Watch,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Sprint 1 placeholder — page exists but functionality lands in a later sprint. */
  placeholder?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  { label: "Accueil", items: [{ label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Hockey",
    items: [
      { label: "Matchs", href: "/matches", icon: Swords },
      { label: "Analyse d'équipe", href: "/analysis", icon: LineChart, placeholder: true },
    ],
  },
  {
    label: "Entraînement",
    items: [{ label: "Séances", href: "/training", icon: Dumbbell, placeholder: true }],
  },
  {
    label: "Athlètes",
    items: [{ label: "Effectif", href: "/athletes", icon: Users }],
  },
  {
    label: "Performance",
    items: [
      { label: "Charge de l'effectif", href: "/performance/load", icon: Gauge, placeholder: true },
      { label: "GPS", href: "/performance/gps", icon: Satellite, placeholder: true },
    ],
  },
  {
    label: "Réglages",
    items: [
      { label: "Club", href: "/settings/club", icon: Building2 },
      { label: "Équipes", href: "/settings/teams", icon: Shield },
      { label: "Joueurs", href: "/settings/players", icon: UserRound },
      { label: "Fournisseurs GPS", href: "/settings/gps-providers", icon: Wifi, placeholder: true },
      { label: "Connexions Garmin", href: "/settings/garmin", icon: Watch, placeholder: true },
    ],
  },
];
