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

## Moonlight が向く場面

表や Mermaid でも同じ情報は書けます。

Moonlight は「どの段階が人の確認ポイントか」「どこで source と preview が循環するか」を余白込みで示したいときに向いています。

```papyr-moonlight
{
  "svg": "<svg><rect/><ellipse/><path d='M0 0h9'/><text>source</text></svg>",
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
