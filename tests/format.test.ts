import { describe, expect, it } from "vitest";
import { calendarDate, clock, count, fromLine, relativeDay, tidyQuestion } from "../src/lib/format";

describe("format", () => {
  const now = new Date("2026-09-27T15:00:00");

  it("describes days the way the library shows them", () => {
    expect(relativeDay("2026-09-27T09:00:00", now)).toBe("Today");
    expect(relativeDay("2026-09-26T21:00:00", now)).toBe("Yesterday");
    expect(relativeDay("2026-09-18T12:00:00", now)).toBe("Sep 18");
    expect(calendarDate("2025-12-02T12:00:00", now)).toBe("Dec 2, 2025");
  });

  it("names whose things they are", () => {
    expect(fromLine(3, "Alex")).toBe("3 Things from Alex");
    expect(fromLine(2, "Marcus")).toBe("Two things from Marcus");
    expect(fromLine(3, "")).toBe("Their 3 Things");
  });

  it("tidies spoken questions", () => {
    expect(tidyQuestion("  what are three things i should do in jersey city ")).toBe(
      "What are three things i should do in jersey city?",
    );
    expect(tidyQuestion("Tell me three things.")).toBe("Tell me three things.");
  });

  it("formats small numbers", () => {
    expect(clock(134)).toBe("2:14");
    expect(count(1, "person", "people")).toBe("1 person");
    expect(count(8, "person", "people")).toBe("8 people");
  });
});
