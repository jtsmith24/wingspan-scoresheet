import { describe, expect, it } from "vitest";
import { codeFor, withCodes } from "./names";

const codes = (names: string[]) => withCodes(names.map(name => ({ name })));

describe("short codes", () => {
  it("uses the first three letters", () => {
    expect(codes(["Jordan", "Christopher", "Kim"])).toEqual(["JOR", "CHR", "KIM"]);
  });

  it("keeps short names and existing codes as they are", () => {
    expect(codes(["Al", "JOR", "bo"])).toEqual(["AL", "JOR", "BO"]);
  });

  it("uses initials for full names", () => {
    expect(codes(["Sam Lee", "Mary Jane Watson"])).toEqual(["SL", "MJW"]);
  });

  it("works around clashes in column order", () => {
    expect(codes(["Sam", "Samantha", "Samuel", "Sam Lee"])).toEqual(["SAM", "SMN", "SML", "SL"]);
  });

  it("numbers identical names", () => {
    expect(codes(["Sam", "Sam", "sam", "Sam"])).toEqual(["SAM", "SA2", "SA3", "SA4"]);
  });

  it("drops accents and symbols, and leaves blanks empty", () => {
    expect(codes(["Zoë", "", "  ", "J.R."])).toEqual(["ZOE", "", "", "JR"]);
  });

  it("never repeats a code", () => {
    const result = codes(["Ann", "Anna", "Annie", "Anne", "Ann", "Anika", "An"]);
    expect(new Set(result).size).toBe(result.length);
    expect(result.every(c => c.length >= 2 && c.length <= 3)).toBe(true);
  });
});

describe("stable codes", () => {
  it("only the newcomer adapts", () => {
    const others = [{ name: "Samantha", code: "SAM" }];
    expect(codeFor("Sam", others)).toBe("SM");
    expect(codeFor("Jordan", others)).toBe("JOR");
  });

  it("keeps codes players already have, wherever they sit", () => {
    expect(
      withCodes([
        { name: "Sam" },
        { name: "Samantha", code: "SAM" },
        { name: "Jordan", code: "JOR" },
      ]),
    ).toEqual(["SM", "SAM", "JOR"]);
  });

  it("a stored code is ignored once the name is cleared", () => {
    expect(withCodes([{ name: "", code: "SAM" }, { name: "Sam" }])).toEqual(["", "SAM"]);
  });

  it("numbers a twin of someone who already has a code", () => {
    expect(codeFor("sam", [{ name: "Sam", code: "SAM" }])).toBe("SA2");
  });
});
