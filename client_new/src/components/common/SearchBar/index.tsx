import { Search } from "lucide-react";

export function SearchBar() {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4">
      <Search className="size-5 text-[var(--color-text-tertiary)]" />
      <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search events, artists, venues, cities" />
    </label>
  );
}
