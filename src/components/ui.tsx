import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "add" | "danger";
};

export function Button({
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`rv-button rv-button--${variant} ${className}`}
      {...props}
    />
  );
}

export function StatusBadge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <span className={`rv-badge rv-badge--${tone} ${className}`} {...props} />
  );
}

export function SectionHeading({
  icon,
  title,
  eyebrow,
}: {
  icon: ReactNode;
  title: string;
  eyebrow: string;
}) {
  return (
    <div className="rv-section-heading">
      <span className="rv-section-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="rv-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

type Segment<T extends string> = { value: T; label: string; testId?: string };

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: readonly Segment<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`rv-segments ${className}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          data-testid={option.testId}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
