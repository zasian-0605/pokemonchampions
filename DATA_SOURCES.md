# Pokémon Champions 2D — 技・特性データソース

## 取り込み内容

- `js/upstream-mechanics.js` に、外部ソースの技・特性メタデータを分離して保存。
- `index.html` からオフライン図鑑データの直後に読み込み。
- `js/app.js` の `loadAllData()` で、既存の技・特性レコードに `upstreamData` として紐づけ。
- 既存の日本語名・日本語説明・習得技・バトル処理は書き換えていない。
- Showdownのコールバック関数本体や英語説明文は取り込まず、数値・フラグ・効果オブジェクト・コールバック名のみを収録。

## PokeAPI

リポジトリ：[PokeAPI/pokeapi](https://github.com/PokeAPI/pokeapi)

| ファイル | 内容 | SHA |
|---|---|---|
| `data/v2/csv/moves.csv` | 技ID・タイプ・威力・PP・命中・優先度・対象・分類・効果ID | `a55116329ca22f230fea953de94c2d1dffe2ad0e` |
| `data/v2/csv/move_meta.csv` | 連続回数・吸収・回復・急所率・状態異常率など | `51bcc2af788bd0df50d15f23a714f182e86d8e49` |
| `data/v2/csv/move_flag_map.csv` / `move_flags.csv` | 技ごとのフラグ | `7bc1067ec44709dce6874e56ece19df6179b3688` / `8db668b72dabf5e9f836d2ea8907daf16d9a6161` |
| `data/v2/csv/abilities.csv` | 特性ID・世代・メインシリーズ区分 | `a1a9591047efb8a0e468f436f216e3dab21065ed` |
| `move_names.csv` / `ability_names.csv` | 日本語名の補助 | `76bd7dd141b2a38f8e88b7d990b3bcbb889e58fe` / `bb18758f41f190c87a982378147edd17bff69935` |

## Pokémon Showdown

リポジトリ：[smogon/pokemon-showdown](https://github.com/smogon/pokemon-showdown)（MIT）

| ファイル | 内容 | SHA |
|---|---|---|
| `data/moves.ts` | 技の構造化効果、能力変化、追加効果、フラグ、処理フック名 | `15c89e0d55bce9cfb8dec04917c3865317e28193` |
| `data/abilities.ts` | 特性のID、フラグ、評価値、処理フック名 | `1ace279db3c91dfc2422ede5e86885510b55bdeb` |

## データの読み方

- 技：`state.data.movesById[...].upstreamData.showdownData` と `state.data.movesById[...].upstreamData.pokeapi`
- 特性：`state.data.abilitiesList[...].upstreamData.showdownData` と `state.data.abilitiesList[...].upstreamData.pokeapi`
- 技はAPI IDで、特性は正規化した識別子で照合。特性の番号はソース間で一致しない場合があるため、番号だけでは結合しない。
- 現在の監査ではPokeAPIの技938行、特性374行を収録。Showdownと照合できたのは技902件、特性314件。未照合技36件は特殊Z技・シャドウ技など、未照合特性の多くはメインシリーズ外のデータ。
- `callbackNames` は必要なイベント処理の目印であり、処理本体ではない。データを読み込んだだけで全効果が実装済みになるわけではない。実際の対戦処理には、効果ごとの接続と重複発動防止、動作テストが必要。
