"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { setActiveTeam } from "@/lib/team-context";
import type { Team } from "@/types/database";

interface TeamSwitcherProps {
  teams: Team[];
  activeTeamId: string | null;
}

export function TeamSwitcher({ teams, activeTeamId }: TeamSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? teams[0];

  function selectTeam(teamId: string) {
    setOpen(false);
    startTransition(async () => {
      await setActiveTeam(teamId);
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-48 justify-between"
            disabled={pending}
          />
        }
      >
        {activeTeam ? activeTeam.short_name || activeTeam.name : "Change team"}
        <ChevronsUpDown className="opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {teams.map((team) => (
                <CommandItem key={team.id} value={team.name} onSelect={() => selectTeam(team.id)}>
                  <Check className={activeTeam?.id === team.id ? "opacity-100" : "opacity-0"} />
                  {team.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
