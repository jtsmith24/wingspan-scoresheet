import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "./rules";
import { paletteFor } from "./theme";

describe("theme", () => {
  it("uses the base palette with no expansions", () => {
    expect(paletteFor(DEFAULT_CONFIG)).toEqual(["base"]);
  });

  it("uses one expansion's own palette", () => {
    expect(paletteFor({ ...DEFAULT_CONFIG, asia: "duet" })).toEqual(["asia"]);
  });

  it("mixes several in the checklist's order", () => {
    const config = { ...DEFAULT_CONFIG, americas: true, european: true, oceania: true };
    expect(paletteFor(config)).toEqual(["european", "oceania", "americas"]);
  });
});
