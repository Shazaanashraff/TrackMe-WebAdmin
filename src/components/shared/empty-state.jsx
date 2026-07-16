export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {Icon && (
        <div className="h-12 w-12 rounded-xl bg-surface-muted flex items-center justify-center">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
      )}
      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
