# CLAUDE.md

@AGENTS.md

上記ハーネスがこのリポジトリの正本ルール。要点のみ再掲する:

- 仕様の正本は SPEC.md。変更は スペック → テスト → 実装 の順。
- すべてのタスクは 7 段階ループプロトコル(AGENTS.md 末尾の共通規律)で進め、
  `python harness/looplog.py append` で `logs/loops/{loop_id}.jsonl` に記録する。
  失敗は気づいた瞬間に FAILURE_TAXONOMY のコード付きで記録する。
- 完了条件は `npm run verify` green + `looplog.py validate` 合格。
- `src/core` は純関数のみ(乱数はシード付き PRNG を注入)・カバレッジ 90% 以上を維持。
  決定性(同一シード + 同一構成 → 同一の重み)を壊さない。
- 正しさの正本は二実装照合オラクル(Python 学習側の出力と TS 推論の一致 G-01/G-02)。モデル資産は training/train_mnist.py だけが生成する。学習ゲート G-xx の数値は
  較正実験の証拠付きでのみ変更できる(緩和は人間の承認が必要)。
- scaffold ブロック(AGENTS.md 末尾)と `.wt/gate.json` の上限は直接編集しない。
