import { cx } from "./ui";

export function Bone({ className }: { className?: string }) {
  return <div className={cx("rounded-xl bg-subtle", className)} />;
}

export function PageSkeleton({ tiles = 4, header = true }: { tiles?: number; header?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Chargement" className="animate-pulse">
      {header && (
        <>
          <Bone className="mb-2 h-4 w-28 rounded-full" />
          <Bone className="mb-8 h-8 w-64 rounded-full" />
        </>
      )}
      {tiles > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: tiles }, (_, i) => (
            <Bone key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}
      <Bone className="h-80 rounded-2xl" />
    </div>
  );
}
