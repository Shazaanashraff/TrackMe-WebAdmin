export function AppLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
        <span className="text-primary-foreground text-lg font-bold font-heading">T</span>
      </div>
      <div
        className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin"
        aria-hidden="true"
      />
      <span className="text-sm text-muted-foreground">Restoring session…</span>
    </div>
  );
}
