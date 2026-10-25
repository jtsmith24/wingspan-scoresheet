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

/** A player as far as codes are concerned. */
export interface Named {
  name: string;
  /** Kept once given, so a player's code never shifts under them. */
  code?: string;
}

/**
 * The code for a name, avoiding the codes `others` already have. Only the
 * newcomer adapts: Samantha keeps SAM and a later Sam gets SM. Identical
 * names are numbered (SAM, SA2, SA3).
 */
export function codeFor(name: string, others: Named[]): string {
  const key = clean(name);
  if (!key) return "";
  const taken = new Set(others.map(o => o.code).filter(Boolean));
  const twin = others.some(o => clean(o.name) === key);
  const code = (twin ? [] : candidates(name)).find(c => !taken.has(c));
  if (code) return code;
  const base = key.replace(/ /g, "").slice(0, 2);
  for (let n = 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
}

/**
 * Header codes for a list of players. Codes players already have are kept;
 * anyone without one (older saves, a name still being typed) gets one in
 * column order. Empty names get "" so the header can show a placeholder.
 */
export function withCodes(players: Named[]): string[] {
  const codes = players.map(() => "");
  const claimed = new Set<string>();
  players.forEach((p, i) => {
    if (clean(p.name) && p.code && !claimed.has(p.code)) {
      codes[i] = p.code;
      claimed.add(p.code);
    }
  });
  players.forEach((p, i) => {
    if (codes[i] || !clean(p.name)) return;
    const others = players
      .map((o, j) => ({ name: o.name, code: codes[j] }))
      .filter((o, j) => j !== i && (o.code || j < i));
    codes[i] = codeFor(p.name, others);
  });
  return codes;
}
