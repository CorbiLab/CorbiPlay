"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { updatePlayerPhoto } from "@/modules/athletes/actions";
import { isSupabaseConfigured } from "@/config/app";
import { PlayerAvatar } from "@/components/shared/player-avatar";

interface PlayerPhotoUploadProps {
  playerId: string;
  name: string;
  photoUrl: string | null;
  shirtNumber: number | null;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function PlayerPhotoUpload({ playerId, name, photoUrl, shirtNumber }: PlayerPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  function handlePick() {
    if (!isSupabaseConfigured()) {
      toast.info("Le téléversement de photo n'est pas disponible en mode démo.");
      return;
    }
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choisis une image (JPEG, PNG…).");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Image trop lourde (5 Mo maximum).");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${playerId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("player-photos").upload(path, file, {
        upsert: true,
        cacheControl: "3600",
      });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("player-photos").getPublicUrl(path);

      const result = await updatePlayerPhoto(playerId, publicUrl);
      if (result.error) throw new Error(result.error);

      toast.success("Photo mise à jour.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du téléversement.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handlePick}
        disabled={uploading}
        className="group relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Changer la photo du joueur"
      >
        <PlayerAvatar photoUrl={photoUrl} shirtNumber={shirtNumber} name={name} size="xl" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
