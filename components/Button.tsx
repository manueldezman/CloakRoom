"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "link";

const base =
  "font-display text-label-lg rounded-sm h-[38px] px-[10px] pt-[6px] pb-[4px] inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-secondary hover:opacity-90",
  secondary: "bg-transparent text-secondary border border-tertiary hover:bg-surface",
  link: "bg-transparent text-secondary h-auto p-0 underline underline-offset-2 hover:opacity-70",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ variant = "primary", className = "", ...props }, ref) {
  return <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />;
});
