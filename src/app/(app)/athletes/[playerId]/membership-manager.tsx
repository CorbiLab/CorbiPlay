"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { addMembership, endMembership, type AddMembershipState } from "@/modules/athletes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Team, TeamMembership } from "@/types/database";
import { POSITION_LABEL } from "@/modules/athletes/position-labels";

const MEMBERSHIP_LABEL: Record<string, string> = {
  PERMANENT: "Permanent",
  TEMPORARY: "Temporaire",
  GUEST: "Invité",
  TRAINING_ONLY: "Entraînement",
};

type MembershipWithTeam = TeamMembership & { team: Pick<Team, "id" | "name" | "short_name"> };

const initialState: AddMembershipState = {};

/**
 * "Équipes actuelles" (spec §8): a player belongs to the club, with
 * independent — possibly concurrent — team memberships, not a single team_id
 * on the player row. Ending one and adding another (rather than editing
 * team_id in place) is both how a wrong assignment gets corrected and how a
 * real age-group move across seasons is recorded, without rewriting history.
 */
export function MembershipManager({ playerId, memberships, teams }: { playerId: string; memberships: MembershipWithTeam[]; teams: Team[] }) {
  const [adding, setAdding] = useState(false);
  const [endingId, startEndTransition] = useTransition();
  const [pendingEndId, setPendingEndId] = useState<string | null>(null);

  function handleEnd(membershipId: string, teamName: string) {
    setPendingEndId(membershipId);
    startEndTransition(async () => {
      const result = await endMembership(membershipId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Retiré de ${teamName}.`);
      }
      setPendingEndId(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {memberships.map((m) => (
          <Badge key={m.id} variant={m.membership_type === "PERMANENT" ? "default" : "outline"} className="gap-1.5 py-1.5 pr-1">
            {m.team.name}
            {m.positions.length > 0 && (
              <span className="text-[10px] opacity-70">{m.positions.map((p) => POSITION_LABEL[p] ?? p).join(" / ")}</span>
            )}
            <span className="text-[10px] uppercase opacity-70">{MEMBERSHIP_LABEL[m.membership_type] ?? m.membership_type}</span>
            <button
              type="button"
              aria-label={`Retirer de ${m.team.name}`}
              onClick={() => handleEnd(m.id, m.team.name)}
              disabled={endingId && pendingEndId === m.id}
              className="ml-0.5 rounded-full p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {!adding && (
          <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" /> Ajouter une équipe
          </Button>
        )}
      </div>

      {adding && <AddMembershipForm playerId={playerId} teams={teams} onDone={() => setAdding(false)} />}
    </div>
  );
}

function AddMembershipForm({ playerId, teams, onDone }: { playerId: string; teams: Team[]; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(async (_prev: AddMembershipState, formData: FormData) => {
    const result = await addMembership(_prev, formData);
    if (!result.error) onDone();
    return result;
  }, initialState);

  if (teams.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucune autre équipe dans le club.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-muted/30 p-2">
      <input type="hidden" name="playerId" value={playerId} />
      <select name="teamId" required className="h-8 rounded-md border border-input bg-transparent px-2 text-sm" defaultValue="">
        <option value="" disabled>
          Équipe
        </option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.short_name || t.name}
          </option>
        ))}
      </select>
      <select name="membershipType" defaultValue="PERMANENT" className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
        <option value="PERMANENT">Permanent</option>
        <option value="TEMPORARY">Temporaire</option>
        <option value="GUEST">Invité</option>
        <option value="TRAINING_ONLY">Entraînement seul</option>
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Ajout..." : "Ajouter"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDone}>
        Annuler
      </Button>
      {state?.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
