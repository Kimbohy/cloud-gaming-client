import type { InputButton } from "@/api/play.api";

interface TouchButtonProps {
  button: InputButton;
  children: React.ReactNode;
  className: string;
  onInput: (button: InputButton, state: "down" | "up") => void;
}

export function TouchButton({
  button,
  children,
  className,
  onInput,
}: TouchButtonProps) {
  return (
    <button
      onTouchStart={(e) => {
        e.preventDefault();
        onInput(button, "down");
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onInput(button, "up");
      }}
      onMouseDown={() => onInput(button, "down")}
      onMouseUp={() => onInput(button, "up")}
      onMouseLeave={() => onInput(button, "up")}
      className={className}
    >
      {children}
    </button>
  );
}
