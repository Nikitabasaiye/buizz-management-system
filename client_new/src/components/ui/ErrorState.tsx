import { TriangleAlert } from "lucide-react";
import { Button } from "./Button";

type ErrorStateProps = {
  title: string;
  description: string;
  onRetry?: () => void;
};

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-status-danger)]/25 bg-[var(--color-status-danger)]/10 p-8 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-status-danger)]/15 text-[var(--color-status-danger)]">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-black text-[var(--color-text-primary)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
      {onRetry && (
        <Button className="mt-5" variant="danger" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
