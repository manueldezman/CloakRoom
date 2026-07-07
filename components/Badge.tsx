export function Badge({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "neutral" | "error";
}) {
  const toneClasses = {
    primary: "border border-primary/80 bg-primary text-secondary",
    neutral: "border border-tertiary bg-transparent text-fg",
    error: "border border-error/55 bg-transparent text-error",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-[2px] px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${toneClasses}`}>
      {children}
    </span>
  );
}
