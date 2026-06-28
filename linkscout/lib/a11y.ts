import type { KeyboardEvent } from "react";

export function triggerOnActivationKey(
  event: KeyboardEvent<HTMLElement>,
  action: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}
