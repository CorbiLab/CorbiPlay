"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { updatePlayer, type UpdatePlayerState } from "@/modules/athletes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const initialState: UpdatePlayerState = {};

interface EditPlayerDialogProps {
  playerId: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  birthDate: string | null;
}

export function EditPlayerDialog({ playerId, firstName, lastName, displayName, birthDate }: EditPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updatePlayer, initialState);
  const submittedRef = useRef(false);

  // Snapshot the fields only at the moment the dialog opens — otherwise a
  // successful save triggers revalidatePath, which re-renders this component
  // with fresh props while the dialog is still mounted (closing a beat
  // later), and Base UI warns about an uncontrolled field's defaultValue
  // changing after init.
  const [fields, setFields] = useState({ firstName, lastName, displayName, birthDate });

  function handleOpenChange(next: boolean) {
    if (next) setFields({ firstName, lastName, displayName, birthDate });
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
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Modifier le joueur" />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le joueur</DialogTitle>
        </DialogHeader>
        <form
          action={action}
          onSubmit={() => {
            submittedRef.current = true;
          }}
          className="space-y-3"
        >
          <input type="hidden" name="playerId" value={playerId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-firstName">Prénom</Label>
              <Input id="edit-firstName" name="firstName" defaultValue={fields.firstName} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-lastName">Nom</Label>
              <Input id="edit-lastName" name="lastName" defaultValue={fields.lastName} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-displayName">Nom affiché</Label>
            <Input id="edit-displayName" name="displayName" defaultValue={fields.displayName ?? ""} placeholder={fields.firstName} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-birthDate">Date de naissance</Label>
            <Input id="edit-birthDate" name="birthDate" type="date" defaultValue={fields.birthDate ?? ""} />
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
