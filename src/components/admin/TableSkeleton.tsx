import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton = ({ rows = 5, columns = 5, className }: TableSkeletonProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 rounded bg-muted animate-shimmer flex-1"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 p-4 border-b border-border last:border-0 animate-fade-in"
          style={{ animationDelay: `${rowIndex * 50}ms` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className={cn(
                "h-4 rounded bg-muted animate-shimmer",
                colIndex === 0 ? "w-24" : "flex-1"
              )}
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn("p-6 rounded-lg border border-border bg-card animate-fade-in", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 rounded bg-muted animate-shimmer" />
        <div className="h-5 w-5 rounded bg-muted animate-shimmer" style={{ animationDelay: '100ms' }} />
      </div>
      <div className="h-8 w-32 rounded bg-muted animate-shimmer" style={{ animationDelay: '200ms' }} />
      <div className="h-4 w-20 rounded bg-muted mt-2 animate-shimmer" style={{ animationDelay: '300ms' }} />
    </div>
  );
};

export const OrderCardSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn("p-4 rounded-lg border border-border bg-card animate-fade-in", className)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="h-5 w-24 rounded bg-muted animate-shimmer" />
        <div className="h-5 w-12 rounded-full bg-muted animate-shimmer" style={{ animationDelay: '100ms' }} />
      </div>
      <div className="h-4 w-32 rounded bg-muted animate-shimmer" style={{ animationDelay: '200ms' }} />
      <div className="flex items-center gap-3 mt-3">
        <div className="h-4 w-20 rounded bg-muted animate-shimmer" style={{ animationDelay: '300ms' }} />
        <div className="h-4 w-24 rounded bg-muted animate-shimmer" style={{ animationDelay: '400ms' }} />
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted mt-3 animate-shimmer" style={{ animationDelay: '500ms' }} />
    </div>
  );
};
