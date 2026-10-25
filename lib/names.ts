/** Longest full name a player can enter. */
export const MAX_NAME_LENGTH = 20;

/** Uppercase letters and digits only, with accents dropped (Zoë → ZOE). */
const clean = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();

/** Codes to try for a name, best first. */
function candidates(name: string): string[] {
  const words = clean(name).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const [first] = words;
  const last = words[words.length - 1];
  const out: string[] = [];
  if (words.length > 1)
    out.push(
      words
        .slice(0, 3)
        .map(w => w[0])
        .join("")
    ); // Sam Lee → SL
  out.push(first.slice(0, 3)); // Jordan → JOR
  if (words.length > 1) out.push(first.slice(0, 2) + last[0]); // Sam Lee → SAL
  // First letter plus later consonants: Samantha → SMN, Samuel → SML.
  const consonants = [...new Set(first.slice(1).replace(/[AEIOU]/g, ""))];
  for (let i = 0; i < consonants.length; i++)
    for (let j = i + 1; j < consonants.length; j++)
      out.push(first[0] + consonants[i] + consonants[j]);
  for (const c of consonants) out.push(first[0] + c);
  return [...new Set(out)];
}

/**
 * A short code per player for the sheet header: the first three letters, or
 * initials for a full name. Codes never repeat; identical names are numbered
 * (SAM, SA2, SA3). Empty names get "" so the header can show a placeholder.
 */
export function shortCodes(names: string[]): string[] {
  const keys = names.map(clean);
  // Names that already fit (Sam, Al) pick first, so Sam keeps SAM even when
  // Samantha sits to the left of them.
  const fits = (k: string) => !k.includes(" ") && k.length <= 3;
  const order = keys
    .map((_, i) => i)
    .sort((a, b) => Number(fits(keys[b])) - Number(fits(keys[a])));
  const codes: string[] = names.map(() => "");
  const taken = new Set<string>();
  const seen = new Set<string>();
  for (const i of order) {
    const key = keys[i];
    if (!key) continue;
    const options = seen.has(key) ? [] : candidates(names[i]);
    seen.add(key);
    let code = options.find(c => !taken.has(c));
    if (!code) {
      const base = key.replace(/ /g, "").slice(0, 2);
      for (let n = 2; !code; n++) {
        const next = `${base}${n}`;
        if (!taken.has(next)) code = next;
      }
    }
    taken.add(code);
    codes[i] = code;
  }
  return codes;
}
