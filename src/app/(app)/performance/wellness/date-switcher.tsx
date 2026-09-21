"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function DateSwitcher({ date }: { date: string }) {
  const router = useRouter();

  return (
    <Input
      type="date"
      value={date}
      onChange={(e) => router.push(`/performance/wellness?date=${e.target.value}`)}
      className="w-[160px]"
    />
  );
}
