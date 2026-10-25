import { describe, expect, it } from "vitest";
import { shortCodes } from "./names";

describe("short codes", () => {
  it("uses the first three letters", () => {
    expect(shortCodes(["Jordan", "Christopher", "Kim"])).toEqual([
      "JOR",
      "CHR",
      "KIM",
    ]);
  });

  it("keeps short names and existing codes as they are", () => {
    expect(shortCodes(["Al", "JOR", "bo"])).toEqual(["AL", "JOR", "BO"]);
  });

  it("uses initials for full names", () => {
    expect(shortCodes(["Sam Lee", "Mary Jane Watson"])).toEqual(["SL", "MJW"]);
  });

  it("works around clashes", () => {
    expect(shortCodes(["Sam", "Samantha", "Samuel", "Sam Lee"])).toEqual([
      "SAM",
      "SMN",
      "SML",
      "SL",
    ]);
  });

  it("lets a name that already fits keep it, wherever it sits", () => {
    expect(shortCodes(["Samantha", "Sam"])).toEqual(["SMN", "SAM"]);
  });

  it("numbers identical names", () => {
    expect(shortCodes(["Sam", "Sam", "sam", "Sam"])).toEqual([
      "SAM",
      "SA2",
      "SA3",
      "SA4",
    ]);
  });

  it("drops accents and symbols, and leaves blanks empty", () => {
    expect(shortCodes(["Zoë", "", "  ", "J.R."])).toEqual([
      "ZOE",
      "",
      "",
      "JR",
    ]);
  });

  it("never repeats a code", () => {
    const names = ["Ann", "Anna", "Annie", "Anne", "Ann", "Anika", "An"];
    const codes = shortCodes(names);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every(c => c.length >= 2 && c.length <= 3)).toBe(true);
  });
});
