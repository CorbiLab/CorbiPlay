"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setAttendanceStatus } from "@/modules/training/actions";
import { ATTENDANCE_STATUS_BADGE_CLASS, ATTENDANCE_STATUS_LABEL } from "@/modules/training/status-labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { cn } from "@/lib/utils";
import type { AttendanceEntry } from "@/modules/training/queries";
import type { AttendanceStatus } from "@/types/database";

const STATUSES = Object.keys(ATTENDANCE_STATUS_LABEL) as AttendanceStatus[];

/**
 * Each row saves immediately on change (no batch "save all") — same
 * immediate-write pattern as MembershipManager/DeleteTeamButton elsewhere in
 * Settings, and a coach marking attendance mid-session shouldn't lose
 * anything already ticked if they navigate away before hitting a save button
 * that doesn't exist yet.
 */
export function AttendanceSection({ sessionId, attendance }: { sessionId: string; attendance: AttendanceEntry[] }) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(attendance.map((a) => [a.player.id, a.attendance.status]))
  );
  const [, startTransition] = useTransition();

  function handleChange(playerId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({ ...prev, [playerId]: status }));
    startTransition(async () => {
      const result = await setAttendanceStatus(sessionId, playerId, status);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Présences — {attendance.length} joueur{attendance.length > 1 ? "s" : ""}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {attendance.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun joueur dans l&apos;effectif actuel de cette équipe pour l&apos;instant.
          </p>
        )}
        {attendance.map(({ player }) => {
          const status = statuses[player.id];
          return (
            <div key={player.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <PlayerAvatar photoUrl={player.photo_url} shirtNumber={null} name={player.display_name || player.first_name} size="xs" />
                <span className="truncate text-sm font-medium">{player.display_name}</span>
              </div>
              <Select value={status} onValueChange={(value) => value && handleChange(player.id, value as AttendanceStatus)}>
                <SelectTrigger className={cn("w-[140px] border-none text-xs font-semibold", ATTENDANCE_STATUS_BADGE_CLASS[status])}>
                  <SelectValue>{(value: string) => ATTENDANCE_STATUS_LABEL[value as AttendanceStatus]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ATTENDANCE_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
