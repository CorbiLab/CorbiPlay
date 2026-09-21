"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setWellnessEntry } from "@/modules/performance/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import type { Player, TeamMembership, WellnessEntry } from "@/types/database";

type RosterPlayer = Player & { membership: TeamMembership };

type WellnessField = "sleep_quality" | "fatigue" | "muscle_soreness" | "stress" | "motivation";
const FIELDS: { key: WellnessField; label: string }[] = [
  { key: "sleep_quality", label: "Sommeil" },
  { key: "fatigue", label: "Fatigue" },
  { key: "muscle_soreness", label: "Courbatures" },
  { key: "stress", label: "Stress" },
  { key: "motivation", label: "Motivation" },
];

type RowState = Record<WellnessField, number | ""> & { pain_flag: boolean };

function rowFromEntry(entry: WellnessEntry | undefined): RowState {
  return {
    sleep_quality: entry?.sleep_quality ?? "",
    fatigue: entry?.fatigue ?? "",
    muscle_soreness: entry?.muscle_soreness ?? "",
    stress: entry?.stress ?? "",
    motivation: entry?.motivation ?? "",
    pain_flag: entry?.pain_flag ?? false,
  };
}

/**
 * A real <table> (via components/ui/table.tsx, already `overflow-x-auto` on
 * its own container), not a CSS grid — 6 data columns + name + action per
 * row doesn't fit a typical content width, and a grid with one flexible
 * `fr` track squeezed that track to near-zero instead of actually
 * overflowing (the earlier bug here: player names disappeared entirely).
 * A table scrolls horizontally on narrow screens instead. Staff-entered
 * (see PERMISSIONS.md: only has_sensitive_access roles can write these
 * tables) — there's no player self-report portal in this app.
 */
export function WellnessForm({ date, roster, entries }: { date: string; roster: RosterPlayer[]; entries: Record<string, WellnessEntry> }) {
  const [rows, setRows] = useState<Record<string, RowState>>(
    Object.fromEntries(roster.map((p) => [p.id, rowFromEntry(entries[p.id])]))
  );
  const [, startTransition] = useTransition();

  function updateField(playerId: string, field: WellnessField, value: number | "") {
    setRows((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }));
  }

  function handleSave(playerId: string) {
    const row = rows[playerId];
    startTransition(async () => {
      const result = await setWellnessEntry(playerId, date, {
        sleep_quality: row.sleep_quality === "" ? null : row.sleep_quality,
        fatigue: row.fatigue === "" ? null : row.fatigue,
        muscle_soreness: row.muscle_soreness === "" ? null : row.muscle_soreness,
        stress: row.stress === "" ? null : row.stress,
        motivation: row.motivation === "" ? null : row.motivation,
        pain_flag: row.pain_flag,
      });
      if (result.error) toast.error(result.error);
      else toast.success("Bien-être enregistré.");
    });
  }

  if (roster.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Aucun joueur dans l&apos;effectif actuel de cette équipe pour l&apos;instant.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Joueur</TableHead>
              {FIELDS.map((f) => (
                <TableHead key={f.key} className="text-center">
                  {f.label}
                </TableHead>
              ))}
              <TableHead className="text-center">Douleur</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.map((player) => {
              const row = rows[player.id];
              return (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">
                    <div className="flex min-w-[10rem] items-center gap-2">
                      <PlayerAvatar photoUrl={player.photo_url} shirtNumber={null} name={player.display_name || player.first_name} size="xs" />
                      <span className="truncate">{player.display_name}</span>
                    </div>
                  </TableCell>
                  {FIELDS.map((f) => (
                    <TableCell key={f.key}>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        className="w-14 text-center"
                        value={row[f.key]}
                        onChange={(e) => updateField(player.id, f.key, e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={row.pain_flag}
                      onChange={(e) => setRows((prev) => ({ ...prev, [player.id]: { ...prev[player.id], pain_flag: e.target.checked } }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleSave(player.id)}>
                      Enregistrer
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
