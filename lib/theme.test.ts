import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "./rules";
import { themeFor } from "./theme";

describe("theme", () => {
  it("uses the base palette with no expansions", () => {
    expect(themeFor(DEFAULT_CONFIG)).toBe("base");
    expect(themeFor(DEFAULT_CONFIG, "oceania")).toBe("base");
  });

  it("keeps the most recently chosen expansion while it's on", () => {
    const config = { ...DEFAULT_CONFIG, european: true, americas: true };
    expect(themeFor(config, "european")).toBe("european");
  });

  it("falls back to the newest expansion in play", () => {
    const config = { ...DEFAULT_CONFIG, european: true, oceania: true };
    expect(themeFor(config, "americas")).toBe("oceania");
    expect(themeFor({ ...config, asia: "duet" })).toBe("asia");
  });
});
