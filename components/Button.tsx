"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "link";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[2px] border px-4 py-2 font-mono text-[14px] leading-none tracking-[0.01em] transition-colors disabled:cursor-not-allowed disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "border-primary/80 bg-primary text-secondary shadow-[0_0_0_1px_rgb(var(--primary)/0.12)_inset] hover:bg-primary/80",
  secondary: "border-tertiary bg-transparent text-fg hover:bg-neutral",
  link: "h-auto border-0 bg-transparent px-0 py-0 text-fg underline underline-offset-4 hover:opacity-75",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ variant = "primary", className = "", ...props }, ref) {
  return <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />;
});
