# AGENTS.md — tegaki-yomi

MNIST 手書き数字認識。学習は Python(training/)・推論は TS(src/core)の二実装構成。
正しさの正本は二実装照合オラクル(G-01/G-02: ロジットと精度の一致)。仕様は SPEC.md、テストは TEST_SPEC.md。

## 1. 技術構成

- Next.js 15(App Router)+ React 19 + TypeScript、静的エクスポート(`output: "export"`)
- テスト: vitest(+ @vitest/coverage-v8)。UI 状態ロジックも可能な限り純関数へ寄せて core でテストする
- ランタイム依存はゼロ追加を原則とする(devDeps は可)
- 学習は `training/train_mnist.py`(numpy のみ・シード固定)。モデル資産(`src/core/model/*.json`)は
  このスクリプトだけが生成する。手で編集しない。再生成したら G-01/G-02 で照合してからコミットする

## 2. looplog 運用の注意

- 新しいイベント種別を初めて使う前に `harness/looplog.py` の EVENT_SPECS(必須フィールドと型)を確認する。推測で引数を組み立てない。
- `test_run` の passed / failed は**直前のテスト出力の数値をそのまま転記**する。記憶で書かない。
- `test_run` の記録はテスト実行と**別コマンド**で行う。実行と記録を同一シェルバッチに
  混ぜると、出力確認前に数値を書くことになる(HC-002)。
- enum フィールド(failure.resolution / severity / commit.kind)の許容値は
  `schema/taxonomy.json` と looplog.py の ENUMS が正。初回使用前に確認する(HC-002)。

## 3. 品質ゲート(完了条件)

`npm run verify` が green であること。内訳:

| ゲート | 基準 |
|---|---|
| typecheck | `tsc --noEmit` エラー 0 |
| lint | eslint エラー 0 |
| test | 全テスト green。`src/core` カバレッジ lines/functions/statements ≥ 90%, branches ≥ 85% |
| build | `next build`(静的エクスポート)成功 |

ゲートを緩める変更(閾値引き下げ、テスト削除・skip、eslint-disable の追加、
学習ゲート G-xx の基準変更(較正実験の証拠なしの緩和)、`.wt/gate.json` の上限変更)は、人間の承認なしに行わない。

## 4. アーキテクチャ規約

- `src/core/` は**純関数のみ**。React / DOM / Node API / `src/` 内の他レイヤへの import を禁止する。
- 依存方向は一方向: `src/app`, `src/components`, `src/lib` → `src/core`。逆方向は禁止。
- 乱数はシード付き PRNG を**注入**する(F-01)。core 内で `Date.now()` / `Math.random()` を直接呼ばない。
  乱数状態は学習状態の一部として持ち回り、同一入力 → 同一出力を保証する。
- 描画(rAF)と学習ステップを分離する(N-03)。1 フレームの学習バッチにステップ上限を設け、
  フレームレートが学習結果・UI 応答性に影響してはならない。
- 学習・評価・価値反復はすべて予算(エピソード数・ステップ数・反復回数)付きで書く。無限ループを書かない。
- 状態管理は React 標準(useState 等)のみ。
- クライアント専用 API(document / window / canvas 生成)は **useEffect 内でのみ**触る。
  useMemo・レンダ本体で呼ぶと SSR プリレンダで落ちる(kobai-walk HC-002 の予防適用)。
- 可視化系の純関数は**非有限値(NaN / ±Inf)入力の挙動を仕様として定義**し core でテストする。
  空クラスタ・タイ等の縁も正常系として仕様化する(kobai-walk HC-002 の予防適用・N-05)。

## 5. 変更禁止領域

- `logs/loops/*.jsonl` — append-only(LL-00a)。訂正は correction イベントで。
- AGENTS.md 末尾の scaffold ブロックと `.scaffold/manifest.json` — scaffold-kit 管理。
- `.wt/gate.json` の上限値 — 変更はレジストリ経由(免除パス・test_command の調整は可)。

## 6. よく使うコマンド

```bash
npm run dev           # 開発サーバ
npm run verify:fast   # typecheck + lint + test(高速ループ用)
npm run verify        # 上記 + next build(完了条件)

python harness/looplog.py append --loop loop_XXX --event ... --data ...
python harness/looplog.py validate
python harness/looplog.py summary --loop loop_XXX

python ../harness-kit/scaffold-kit/scripts/scaffoldctl.py status --registry ../harness-kit/scaffold-kit/registry
```

<!-- scaffold:block agents_core v1.8.0 -->
## 共通規律(scaffold 管理領域 — 手動編集禁止)

このセクションはスキャフォールド・レジストリが管理する。内容を変更したい場合は、
このファイルを直接編集せず、失敗ログ → HARNESS_CHANGELOG 起票 → レジストリ改訂 → `scaffoldctl update` の経路で行うこと。

### 7 段階ループプロトコル

| 段階 | 名称 | 完了条件 |
|---|---|---|
| 1 | 計画 | 対象の要求 ID を特定し、`loop_start` を記録した |
| 2 | 文脈読込 | SPEC.md / IMPLEMENTATION_GUIDE.md の該当箇所と、直近ループのログを読んだ |
| 3 | テスト先行 | TEST_SPEC.md にトレースする失敗するテストを書き、赤を確認した |
| 4 | 実装 | ファイル編集 2 回ごとにテストを実行し、赤のまま次の編集に進んでいない |
| 5 | 検証 | 全テスト合格 + 独立再計算(該当時)を確認した |
| 6 | 文書同期 | SPEC/docs と実装の乖離(SPEC-DRIFT)を解消し、生成ドキュメントを再生成した |
| 7 | 完了 | `loop_end` を記録し、ループログ validate に合格し、専用コミットを積んだ |

### ループ可観測性

全ループは loop-observability の規律(LOOP_LOG_SPEC / FAILURE_TAXONOMY)に従い
`logs/loops/{loop_id}.jsonl` に記録する。失敗は気づいた瞬間に分類コード付きで記録する。
ツーストライク(LL-10)と S1 即時起票(LL-12)は本プロジェクトでも有効である。

### エスカレーション規範

以下の場合は作業を止め、`escalation` を記録してから人間に確認する:
仕様の複数解釈(SPEC-AMB 相当)/ スコープ外ファイルへの変更が必要になった /
破壊的操作(履歴改変・データ削除・強制 push)/ 同種の修正の 3 回目の失敗(PROC-LOOP)。

### コミット規約

Conventional Commits(feat/fix/test/docs/refactor/chore)。スキャフォールド更新は
`chore: scaffold vX.Y.Z` の専用コミットで行い、機能変更と混ぜない。
<!-- /scaffold:block agents_core -->
