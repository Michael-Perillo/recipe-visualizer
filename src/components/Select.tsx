import { useRef, useState, type ReactNode } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = {
  "aria-label": string;
  "aria-describedby"?: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
};

export function Select({
  value,
  options,
  onChange,
  disabled,
  className = "",
  icon,
  ...labelProps
}: SelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dark, setDark] = useState(false);

  return (
    <SelectPrimitive.Root
      value={value}
      items={options}
      onValueChange={(nextValue) => onChange(nextValue ?? "")}
      onOpenChange={(open) => {
        if (open) {
          setDark(
            triggerRef.current?.closest(".rv-theme, .dark")
              ?.classList.contains("dark") ?? false,
          );
        }
      }}
      disabled={disabled}
      modal={false}
    >
      <SelectPrimitive.Trigger
        ref={triggerRef}
        className={`rv-field rv-select-trigger ${className}`}
        {...labelProps}
      >
        {icon ? <span className="rv-select-leading" aria-hidden="true">{icon}</span> : null}
        <SelectPrimitive.Value className="rv-select-value" />
        <SelectPrimitive.Icon className="rv-select-chevron">
          <ChevronDown size={16} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      {/* The body portal escapes transformed/clipped Storybook docs canvases.
          Carry the trigger's local theme into that separate DOM subtree. */}
      <SelectPrimitive.Portal className={`rv-theme ${dark ? "dark" : ""}`}>
        <SelectPrimitive.Positioner
          className="rv-select-positioner"
          positionMethod="fixed"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          alignItemWithTrigger={false}
        >
          <SelectPrimitive.Popup className="rv-select-popup">
            <SelectPrimitive.ScrollUpArrow className="rv-select-scroll-arrow">
              <ChevronUp size={16} aria-hidden="true" />
            </SelectPrimitive.ScrollUpArrow>
            <SelectPrimitive.List className="rv-select-list">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="rv-select-option"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="rv-select-check">
                    <Check size={16} aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
            <SelectPrimitive.ScrollDownArrow className="rv-select-scroll-arrow">
              <ChevronDown size={16} aria-hidden="true" />
            </SelectPrimitive.ScrollDownArrow>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
