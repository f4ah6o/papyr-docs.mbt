---
kind: article
slug: moonlight-authoring-sample
title: 'Moonlight block で authoring flow を残す'
summary: 'papyr-moonlight フェンスを使って、Papyr の authoring / preview / regression 確認に使える設計メモを公開 docs に置く例。'
emoji: 🧭
published: true
topics: [authoring, preview, moonlight, regression]
updatedAt: 2026-05-09T00:00:00.000Z
---

# Moonlight block で authoring flow を残す

Papyr の文書では、文章で意図を残しながら、手描きに近い構成図を同じ Markdown source に置けます。
このページは、`papyr-moonlight` フェンスを docs content の中で実際に使うための小さな設計メモです。

下の図は、ローカルの Markdown authoring から preview へ進み、レビューで見つけた差分をまた source に戻す流れを表しています。
表や Mermaid でも同じ情報は書けますが、Moonlight は「どの段階が人の確認ポイントか」「どこで source と preview が循環するか」を余白込みで示したいときに向いています。

```papyr-moonlight
{
  "svg": "<svg viewBox=\"0 0 780 250\" role=\"img\" aria-label=\"Authoring flow\" xmlns=\"http://www.w3.org/2000/svg\"><defs><marker id=\"flow-arrow\" markerWidth=\"10\" markerHeight=\"7\" refX=\"9\" refY=\"3.5\" orient=\"auto\"><polygon points=\"0 0, 10 3.5, 0 7\" fill=\"#41515a\" /></marker><marker id=\"review-arrow\" markerWidth=\"10\" markerHeight=\"7\" refX=\"9\" refY=\"3.5\" orient=\"auto\"><polygon points=\"0 0, 10 3.5, 0 7\" fill=\"#805a2f\" /></marker></defs><rect width=\"780\" height=\"250\" rx=\"18\" fill=\"#fffdfa\" /><rect x=\"0\" y=\"0\" width=\"180\" height=\"88\" rx=\"10\" fill=\"#f3efe2\" stroke=\"#2f3a3f\" stroke-width=\"2\" /><text x=\"24\" y=\"52\" fill=\"#263238\" font-size=\"20\">Markdown source</text><path d=\"M180 44 H284\" fill=\"none\" stroke=\"#41515a\" stroke-width=\"2\" marker-end=\"url(#flow-arrow)\" /><rect x=\"284\" y=\"0\" width=\"188\" height=\"88\" rx=\"10\" fill=\"#e4f2ee\" stroke=\"#2f3a3f\" stroke-width=\"2\" /><text x=\"318\" y=\"36\" fill=\"#263238\" font-size=\"20\">Papyr parse</text><text x=\"316\" y=\"64\" fill=\"#4e5d64\" font-size=\"16\">Document model</text><path d=\"M472 44 H576\" fill=\"none\" stroke=\"#41515a\" stroke-width=\"2\" marker-end=\"url(#flow-arrow)\" /><rect x=\"576\" y=\"0\" width=\"176\" height=\"88\" rx=\"10\" fill=\"#e8eef7\" stroke=\"#2f3a3f\" stroke-width=\"2\" /><text x=\"616\" y=\"54\" fill=\"#263238\" font-size=\"22\">Preview</text><ellipse cx=\"388\" cy=\"196\" rx=\"78\" ry=\"36\" fill=\"#fff4d7\" stroke=\"#805a2f\" stroke-width=\"2\" /><text x=\"336\" y=\"202\" fill=\"#6a471f\" font-size=\"18\">Manual review</text><path d=\"M640 88 C580 152 520 184 466 196\" fill=\"none\" stroke=\"#805a2f\" stroke-width=\"2\" marker-end=\"url(#review-arrow)\" /><path d=\"M310 196 C190 192 114 140 92 88\" fill=\"none\" stroke=\"#805a2f\" stroke-width=\"2\" marker-end=\"url(#review-arrow)\" /></svg>",
  "caption": "Markdown source、PapyrDocument、preview、manual review が循環する authoring flow。"
}
```

## Papyr authoring / preview で役立つ点

このような図を docs に置くと、設計メモと表示確認を分けずに扱えます。
Markdown source では `papyr-moonlight` の JSON payload として保存され、preview では Moonlight block として read-only に描画されます。

著者は本文で判断理由を書き、図では関係性や戻り線を示せます。
読む側は「どの block が parser を通り、どの block が preview renderer に届くのか」を 1 ページで確認できます。

## 将来の手動 regression sample として

このページは、新しい renderer や editor UX を追加するための実装ではありません。
既存の docs/content conventions だけで置ける公開サンプルとして、今後の手動確認に使えるようにしています。

特に次の観点を目視できます。

- `papyr-moonlight` フェンスが通常の docs build で失われないこと
- rectangle、ellipse、arrow、text が preview で同じ scene として並ぶこと
- caption と周辺 Markdown が Moonlight block の前後で自然に読めること

このページが壊れた場合、Markdown parser、docs content build、preview renderer のどこかで Moonlight block の扱いが変わった可能性を疑えます。
