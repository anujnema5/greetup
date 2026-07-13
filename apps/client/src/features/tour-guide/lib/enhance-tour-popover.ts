import type { PopoverDOM } from "driver.js";

/** DOM tweaks after driver.js renders the popover (close icon, button labels). */
export function enhanceTourPopover(popover: PopoverDOM): void {
  popover.closeButton.innerHTML = "";
  popover.closeButton.setAttribute("aria-label", "Close tour");
  popover.closeButton.setAttribute("type", "button");
}
