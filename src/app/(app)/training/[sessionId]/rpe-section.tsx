"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setSessionRpe } from "@/modules/performance/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import type { AttendanceEntry } from "@/modules/training/queries";
import type { SessionRpeEntry } from "@/types/database";

/**
 * Only players marked present/modified get an RPE row — asking an absent
 * player how hard a session felt makes no sense (see AttendanceSection for
 * the status this filters on). One shared session duration (the common
 * case) rather than per-player, still stored per-row since the schema
 * allows it — a coach correcting one player who left early is an edit
 * they can make directly in the database for now, not a UI this needs yet.
 */
export function RpeSection({
  sportingSessionId,
  attendance,
  existingEntries,
}: {
  sportingSessionId: string;
  attendance: AttendanceEntry[];
  existingEntries: SessionRpeEntry[];
}) {
  const present = attendance.filter((a) => a.attendance.status === "PRESENT" || a.attendance.status === "MODIFIED");
  const entryByPlayer = new Map(existingEntries.map((e) => [e.player_id, e]));

  const [durationMin, setDurationMin] = useState(existingEntries[0]?.duration_min ?? 60);
  const [rpeByPlayer, setRpeByPlayer] = useState<Record<string, number | "">>(
    Object.fromEntries(present.map((a) => [a.player.id, entryByPlayer.get(a.player.id)?.rpe ?? ""]))
  );
  const [, startTransition] = useTransition();

  function handleSave(playerId: string) {
    const rpe = rpeByPlayer[playerId];
    if (rpe === "" || rpe == null) return;
    startTransition(async () => {
      const result = await setSessionRpe(sportingSessionId, playerId, durationMin, rpe);
      if (result.error) toast.error(result.error);
      else toast.success("RPE enregistré.");
    });
  }

  if (present.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Charge perçue (RPE)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-w-[200px] space-y-1">
          <Label htmlFor="rpe-duration">Durée de la séance (min)</Label>
          <Input
            id="rpe-duration"
            type="number"
            min={1}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          {present.map(({ player }) => (
            <div key={player.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <PlayerAvatar photoUrl={player.photo_url} shirtNumber={null} name={player.display_name || player.first_name} size="xs" />
                <span className="truncate text-sm font-medium">{player.display_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  className="w-16"
                  value={rpeByPlayer[player.id] ?? ""}
                  onChange={(e) =>
                    setRpeByPlayer((prev) => ({ ...prev, [player.id]: e.target.value === "" ? "" : Number(e.target.value) }))
                  }
                />
                <Button variant="outline" size="sm" onClick={() => handleSave(player.id)}>
                  Enregistrer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
