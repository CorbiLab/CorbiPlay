"use client";

import { useActionState, useState } from "react";
import { createMatch, type CreateMatchState } from "@/modules/matches/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Team } from "@/types/database";

const initialState: CreateMatchState = {};

type MatchFormat = "QUARTERS" | "HALVES";
const MATCH_FORMAT_LABEL: Record<MatchFormat, string> = { QUARTERS: "Quarts-temps (4)", HALVES: "Mi-temps (2)" };
// Typical field hockey durations — a starting point the analyst can override,
// not a rule enforced anywhere (competitions vary, especially by age category).
const DEFAULT_PERIOD_MINUTES: Record<MatchFormat, number> = { QUARTERS: 15, HALVES: 30 };

function teamLabel(team: Team): string {
  return team.age_category ? `${team.name} (${team.age_category})` : team.name;
}

export function NewMatchForm({ teams, defaultTeamId, seasonId }: { teams: Team[]; defaultTeamId: string; seasonId: string }) {
  const [state, action, pending] = useActionState(createMatch, initialState);
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("QUARTERS");
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState(DEFAULT_PERIOD_MINUTES.QUARTERS);

  function handleFormatChange(next: MatchFormat) {
    setMatchFormat(next);
    setPeriodDurationMinutes(DEFAULT_PERIOD_MINUTES[next]);
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="seasonId" value={seasonId} />

      <div className="space-y-2">
        <Label htmlFor="teamId">Équipe</Label>
        <Select name="teamId" defaultValue={defaultTeamId}>
          <SelectTrigger id="teamId" className="w-full">
            {/* SelectValue doesn't read a matching SelectItem's children back
                out on its own (Base UI: it shows the raw value unless you
                map it yourself) — the render-prop below is that mapping. */}
            <SelectValue>{(value: string) => (teamById.get(value) ? teamLabel(teamById.get(value)!) : value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {teamLabel(team)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* SelectTrigger isn't a native form field — mirror its value for Server Actions. */}
      </div>

      <div className="space-y-2">
        <Label htmlFor="opponentName">Adversaire</Label>
        <Input id="opponentName" name="opponentName" required placeholder="Leopold U16 Boys" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="matchDate">Date</Label>
          <Input id="matchDate" name="matchDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="homeOrAway">Domicile / Extérieur</Label>
          <Select name="homeOrAway" defaultValue="HOME">
            <SelectTrigger id="homeOrAway" className="w-full">
              <SelectValue>{(value: string) => (value === "AWAY" ? "Extérieur" : "Domicile")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOME">Domicile</SelectItem>
              <SelectItem value="AWAY">Extérieur</SelectItem>
            </SelectContent>
          </Select>
          {/* SelectTrigger isn't a native form field — mirror its value for Server Actions. */}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue">Terrain</Label>
        <Input id="venue" name="venue" placeholder="Terrain Waterloo Ducks" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="competition">Compétition</Label>
        <Input id="competition" name="competition" placeholder="Championnat U16" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="matchFormat">Format</Label>
          <Select name="matchFormat" value={matchFormat} onValueChange={(value) => handleFormatChange(value as MatchFormat)}>
            <SelectTrigger id="matchFormat" className="w-full">
              <SelectValue>{(value: string) => MATCH_FORMAT_LABEL[value as MatchFormat]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="QUARTERS">{MATCH_FORMAT_LABEL.QUARTERS}</SelectItem>
              <SelectItem value="HALVES">{MATCH_FORMAT_LABEL.HALVES}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodDurationMinutes">
            Durée par {matchFormat === "HALVES" ? "mi-temps" : "quart-temps"} (min)
          </Label>
          <Input
            id="periodDurationMinutes"
            name="periodDurationMinutes"
            type="number"
            min={1}
            required
            value={periodDurationMinutes}
            onChange={(e) => setPeriodDurationMinutes(Number(e.target.value))}
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Création..." : "Créer le match"}
      </Button>
    </form>
  );
}
