"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { updateTeam, type UpdateTeamState } from "@/modules/teams/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const initialState: UpdateTeamState = {};

interface EditTeamDialogProps {
  teamId: string;
  name: string;
  shortName: string | null;
  ageCategory: string | null;
  gender: string | null;
}

export function EditTeamDialog({ teamId, name, shortName, ageCategory, gender }: EditTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateTeam, initialState);
  const submittedRef = useRef(false);

  // Snapshot the fields only at the moment the dialog opens — see
  // edit-player-dialog.tsx for why (revalidatePath re-renders this with
  // fresh props while the dialog is still closing, which would otherwise
  // trip Base UI's uncontrolled-field warning).
  const [fields, setFields] = useState({ name, shortName, ageCategory, gender });

  function handleOpenChange(next: boolean) {
    if (next) setFields({ name, shortName, ageCategory, gender });
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
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Modifier l'équipe" />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;équipe</DialogTitle>
        </DialogHeader>
        <form
          action={action}
          onSubmit={() => {
            submittedRef.current = true;
          }}
          className="space-y-3"
        >
          <input type="hidden" name="teamId" value={teamId} />
          <div className="space-y-1">
            <Label htmlFor="edit-team-name">Nom de l&apos;équipe</Label>
            <Input id="edit-team-name" name="name" defaultValue={fields.name} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-team-shortName">Nom court</Label>
            <Input id="edit-team-shortName" name="shortName" defaultValue={fields.shortName ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-team-ageCategory">Catégorie d&apos;âge</Label>
              <Input id="edit-team-ageCategory" name="ageCategory" defaultValue={fields.ageCategory ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-team-gender">Genre</Label>
              <Input id="edit-team-gender" name="gender" defaultValue={fields.gender ?? ""} />
            </div>
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
