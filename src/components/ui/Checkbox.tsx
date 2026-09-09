import { forwardRef, type InputHTMLAttributes } from "react";
/** Native input semantics with an entirely custom checkbox/switch appearance. */
export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    variant?: "checkbox" | "switch";
  }
>(({ variant = "checkbox", className = "", ...props }, ref) => (
  <input
    {...props}
    ref={ref}
    type="checkbox"
    role={variant === "switch" ? "switch" : undefined}
    className={`custom-check ${variant === "switch" ? "custom-switch" : ""} ${className}`}
  />
));
