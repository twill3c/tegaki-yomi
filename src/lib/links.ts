// フッタリンク(F-09)。読ませ方=操作説明・設計図はアーティファクト(要共有リンク)。

export interface FooterLink {
  label: string;
  href: string;
}

export const FOOTER_LINKS: readonly FooterLink[] = [
  {
    label: "MIT License",
    href: "https://github.com/twill3c/tegaki-yomi/blob/main/LICENSE",
  },
  { label: "GitHub", href: "https://github.com/twill3c/tegaki-yomi" },
  {
    label: "tegaki-yomi の読ませ方",
    href: "https://claude.ai/code/artifact/9c471805-5f62-4320-a76b-e5077bcca458",
  },
  {
    label: "tegaki-yomi 設計図",
    href: "https://claude.ai/code/artifact/db40254d-b207-4605-ba48-82f01efa33c2",
  },
  { label: "App Menu", href: "https://app-menu-amber.vercel.app" },
] as const;
