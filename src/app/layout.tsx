import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tegaki-yomi — 手書き数字認識",
  description:
    "Canvas に描いた手書き数字を MNIST 学習済みニューラルネットがその場で読む。前処理・隠れ層の反応・重みテンプレートまで中身を全部見せる認識アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
