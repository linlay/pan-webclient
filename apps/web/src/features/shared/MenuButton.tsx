import { type ReactNode, useEffect, useRef, useState } from "react";

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

export function MenuButton(props: {
  actions: MenuAction[];
  buttonLabel: string;
  buttonClassName?: string;
  buttonContent: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="menu-root" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label={props.buttonLabel}
        className={props.buttonClassName ?? "icon-button"}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {props.buttonContent}
      </button>
      {open ? (
        <div className={`menu-popover ${props.align === "left" ? "is-left" : "is-right"}`}>
          {props.actions.map((action) => (
            <button
              className={`menu-item ${action.danger ? "is-danger" : ""}`}
              disabled={action.disabled}
              key={action.label}
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              type="button"
            >
              <span className="menu-item-icon">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
