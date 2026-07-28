"use client";

import { LogOut } from "lucide-react";
import { LoadingButton } from "@/components/common/LoadingButton";

export function LogoutButton({
  onClick,
  compact = false,
  loading = false,
}: {
  onClick: () => void;
  compact?: boolean;
  loading?: boolean;
}) {
  return (
    <LoadingButton
      loading={loading}
      loadingText="Logging out..."
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-brand-primary)] text-xs font-black text-white shadow-[0_12px_30px_rgba(236,27,114,0.22)] transition duration-300 hover:scale-[1.02] hover:bg-[var(--color-brand-primary)] hover:shadow-[0_16px_38px_rgba(236,27,114,0.28)] ${compact ? "min-h-9 px-3" : "h-9 w-full px-3"}`}
    >
      <LogOut className="size-4 text-current" />
      <span>Logout</span>
    </LoadingButton>
  );
}
