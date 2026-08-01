// Deterministic color generator: the same label always maps to the same hue,
// so category chips stay visually consistent across reloads and re-sorts,
// even as new category values appear in the data over time.
export function categoryColor(label) {
  const str = String(label || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 62%, 60%)`;
}
