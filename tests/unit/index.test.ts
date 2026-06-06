import { describe, expect, it } from "vitest";

import { packageName } from "../../src/index";

describe("public entry point", () => {
  it("exports the package name", () => {
    expect(packageName).toBe("human-motion-tracking-plugin");
  });
});
