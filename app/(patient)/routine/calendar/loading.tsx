export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando calendario"
      className="mx-auto grid max-w-5xl gap-6 px-5 py-8"
    >
      <p className="text-muted-foreground">Cargando tu calendario…</p>
      <div className="h-96 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
    </div>
  );
}
