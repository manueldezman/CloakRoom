export function Badge({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "neutral" | "error";
}) {
  const toneClasses = {
    primary: "bg-primary text-secondary",
    neutral: "bg-surface text-on-surface border border-tertiary",
    error: "bg-white text-error border border-error",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-label-sm ${toneClasses}`}>
      {children}
    </span>
  );
}
