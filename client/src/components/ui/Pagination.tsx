"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

type PaginationProps = {
  page: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, loading, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination" aria-busy={loading || undefined}>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<ChevronLeft className="size-4" />}
        disabled={page <= 1 || loading}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <div className="flex items-center gap-1">
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            disabled={loading}
            className={cn(
              "grid size-9 place-items-center rounded-full text-sm font-black transition disabled:opacity-50",
              item === page
                ? "bg-[var(--color-brand-primary)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]"
            )}
            aria-current={item === page ? "page" : undefined}
          >
            {item}
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        rightIcon={<ChevronRight className="size-4" />}
        disabled={page >= totalPages || loading}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
