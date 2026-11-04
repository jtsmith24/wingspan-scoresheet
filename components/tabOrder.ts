/**
 * Moves Tab or Shift+Tab to the next or previous control inside
 * `container`, wrapping at the ends, instead of leaving it to the browser:
 * Safari's Tab skips buttons by default, so in a panel of buttons it would
 * go straight to its own toolbar. Skips what Tab wouldn't reach: disabled
 * and hidden controls, and those taken out of the order.
 */
export function moveTab(container: HTMLElement, e: KeyboardEvent) {
  const items = [
    ...container.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled)"
    ),
  ].filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0);
  if (!items.length) return;
  e.preventDefault();
  const at = items.indexOf(document.activeElement as HTMLElement);
  const next =
    at === -1 ? (e.shiftKey ? items.length - 1 : 0) : at + (e.shiftKey ? -1 : 1);
  items[(next + items.length) % items.length].focus();
}
