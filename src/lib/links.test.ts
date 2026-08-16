import { describe, expect, it } from "vitest";
import { FOOTER_LINKS } from "@/lib/links";

// T-080(F-09): フッタリンクの構成

describe("FOOTER_LINKS", () => {
  it("5 件(License/GitHub/読ませ方/設計図/App Menu)で全 https・ラベル非空", () => {
    expect(FOOTER_LINKS.map((l) => l.label)).toEqual([
      "MIT License",
      "GitHub",
      "tegaki-yomi の読ませ方",
      "tegaki-yomi 設計図",
      "App Menu",
    ]);
    for (const l of FOOTER_LINKS) {
      expect(l.href).toMatch(/^https:\/\//);
      expect(l.label.length).toBeGreaterThan(0);
    }
    expect(FOOTER_LINKS[2].href).not.toBe(FOOTER_LINKS[3].href);
  });
});
