import type { ReactNode } from 'react';

export function LoadingState({ rows = 3 }: { readonly rows?: number }) {
  return <div role="status" aria-busy="true" aria-label="Loading" className="space-y-200">
    <p className="text-200 text-muted-foreground">Reading fictional recipients and persisted timeline...</p>
    {Array.from({ length: rows }, (_, index) => <div key={index} className="rounded-md border border-border bg-muted p-400" />)}
  </div>;
}

export function EmptyState({ title, hint, action }: {
  readonly title: string; readonly hint?: string; readonly action?: ReactNode;
}) {
  return <div className="space-y-200 rounded-lg border border-dashed border-border p-500 text-300">
    <p className="font-semibold">{title}</p>
    {hint && <p className="text-muted-foreground">{hint}</p>}
    {action}
  </div>;
}

export function ErrorState({ message, onRetry }: {
  readonly message: string; readonly onRetry?: () => void;
}) {
  return <div role="alert" className="space-y-200 rounded-lg border border-destructive bg-card p-400 text-300">
    <p className="font-semibold text-destructive">That didn&apos;t work</p>
    <p>{message}</p>
    {onRetry && <button type="button" className="rounded-md border border-border px-300 py-200 font-semibold hover:bg-accent" onClick={onRetry}>Try again</button>}
  </div>;
}
