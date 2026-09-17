"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { updateMatch, type UpdateMatchState } from "@/modules/matches/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { HomeAway } from "@/types/database";

const initialState: UpdateMatchState = {};

interface EditMatchDialogProps {
  matchId: string;
  opponentName: string;
  matchDate: string;
  venue: string | null;
  competition: string | null;
  homeOrAway: HomeAway;
}

export function EditMatchDialog({ matchId, opponentName, matchDate, venue, competition, homeOrAway }: EditMatchDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateMatch, initialState);
  const submittedRef = useRef(false);

  // Snapshot the fields only at the moment the dialog opens — see
  // edit-player-dialog.tsx for why (revalidatePath re-renders this with
  // fresh props while the dialog is still closing, which would otherwise
  // trip Base UI's uncontrolled-field warning).
  const [fields, setFields] = useState({ opponentName, matchDate, venue, competition, homeOrAway });

  function handleOpenChange(next: boolean) {
    if (next) setFields({ opponentName, matchDate, venue, competition, homeOrAway });
    setOpen(next);
  }

  useEffect(() => {
    if (submittedRef.current && !pending && !state.error) {
      submittedRef.current = false;
      setOpen(false);
    }
  }, [state, pending]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Modifier le match" />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le match</DialogTitle>
        </DialogHeader>
        <form
          action={action}
          onSubmit={() => {
            submittedRef.current = true;
          }}
          className="space-y-3"
        >
          <input type="hidden" name="matchId" value={matchId} />
          <div className="space-y-1">
            <Label htmlFor="edit-opponentName">Adversaire</Label>
            <Input id="edit-opponentName" name="opponentName" defaultValue={fields.opponentName} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-matchDate">Date</Label>
              <Input id="edit-matchDate" name="matchDate" type="date" defaultValue={fields.matchDate.slice(0, 10)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-homeOrAway">Domicile / Extérieur</Label>
              <Select name="homeOrAway" defaultValue={fields.homeOrAway}>
                <SelectTrigger id="edit-homeOrAway" className="w-full">
                  {/* SelectValue shows the raw value unless mapped — Base UI
                      doesn't read it back from a matching SelectItem's
                      children on its own. */}
                  <SelectValue>{(value: string) => (value === "AWAY" ? "Extérieur" : "Domicile")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOME">Domicile</SelectItem>
                  <SelectItem value="AWAY">Extérieur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-venue">Terrain</Label>
            <Input id="edit-venue" name="venue" defaultValue={fields.venue ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-competition">Compétition</Label>
            <Input id="edit-competition" name="competition" defaultValue={fields.competition ?? ""} />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
