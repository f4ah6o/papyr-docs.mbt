---
kind: article
slug: excalidraw-authoring-sample
title: 'Excalidraw block で authoring flow を残す'
summary: 'papyr-excalidraw フェンスを使って、Papyr の authoring / preview / regression 確認に使える設計メモを公開 docs に置く例。'
emoji: 🧭
published: true
topics: [authoring, preview, excalidraw, regression]
updatedAt: 2026-05-09T00:00:00.000Z
---

# Excalidraw block で authoring flow を残す

Papyr の文書では、文章で意図を残しながら、手描きに近い構成図を同じ Markdown source に置けます。
このページは、`papyr-excalidraw` フェンスを docs content の中で実際に使うための小さな設計メモです。

下の図は、ローカルの Markdown authoring から preview へ進み、レビューで見つけた差分をまた source に戻す流れを表しています。
表や Mermaid でも同じ情報は書けますが、Excalidraw は「どの段階が人の確認ポイントか」「どこで source と preview が循環するか」を余白込みで示したいときに向いています。

```papyr-excalidraw
{
  "elements": [
    {
      "type": "rectangle",
      "x": 0,
      "y": 0,
      "width": 180,
      "height": 88,
      "strokeColor": "#2f3a3f",
      "backgroundColor": "#f3efe2",
      "strokeWidth": 2
    },
    {
      "type": "text",
      "x": 24,
      "y": 26,
      "text": "Markdown source",
      "fontSize": 20,
      "strokeColor": "#263238"
    },
    {
      "type": "arrow",
      "x": 180,
      "y": 44,
      "width": 104,
      "height": 0,
      "strokeColor": "#41515a",
      "strokeWidth": 2,
      "points": [
        [0, 0],
        [104, 0]
      ]
    },
    {
      "type": "rectangle",
      "x": 284,
      "y": 0,
      "width": 188,
      "height": 88,
      "strokeColor": "#2f3a3f",
      "backgroundColor": "#e4f2ee",
      "strokeWidth": 2
    },
    {
      "type": "text",
      "x": 318,
      "y": 18,
      "text": "Papyr parse",
      "fontSize": 20,
      "strokeColor": "#263238"
    },
    {
      "type": "text",
      "x": 316,
      "y": 46,
      "text": "Document model",
      "fontSize": 16,
      "strokeColor": "#4e5d64"
    },
    {
      "type": "arrow",
      "x": 472,
      "y": 44,
      "width": 104,
      "height": 0,
      "strokeColor": "#41515a",
      "strokeWidth": 2,
      "points": [
        [0, 0],
        [104, 0]
      ]
    },
    {
      "type": "rectangle",
      "x": 576,
      "y": 0,
      "width": 176,
      "height": 88,
      "strokeColor": "#2f3a3f",
      "backgroundColor": "#e8eef7",
      "strokeWidth": 2
    },
    {
      "type": "text",
      "x": 616,
      "y": 26,
      "text": "Preview",
      "fontSize": 22,
      "strokeColor": "#263238"
    },
    {
      "type": "ellipse",
      "x": 310,
      "y": 160,
      "width": 156,
      "height": 72,
      "strokeColor": "#805a2f",
      "backgroundColor": "#fff4d7",
      "strokeWidth": 2
    },
    {
      "type": "text",
      "x": 336,
      "y": 180,
      "text": "Manual review",
      "fontSize": 18,
      "strokeColor": "#6a471f"
    },
    {
      "type": "arrow",
      "x": 640,
      "y": 88,
      "width": -178,
      "height": 94,
      "strokeColor": "#805a2f",
      "strokeWidth": 2,
      "points": [
        [0, 0],
        [-60, 64],
        [-178, 94]
      ]
    },
    {
      "type": "arrow",
      "x": 310,
      "y": 196,
      "width": -218,
      "height": -108,
      "strokeColor": "#805a2f",
      "strokeWidth": 2,
      "points": [
        [0, 0],
        [-120, -4],
        [-218, -108]
      ]
    }
  ],
  "appState": {
    "viewBackgroundColor": "#fffdfa"
  },
  "caption": "Markdown source、PapyrDocument、preview、manual review が循環する authoring flow。"
}
```

## Papyr authoring / preview で役立つ点

このような図を docs に置くと、設計メモと表示確認を分けずに扱えます。
Markdown source では `papyr-excalidraw` の JSON payload として保存され、preview では Excalidraw block として read-only に描画されます。

著者は本文で判断理由を書き、図では関係性や戻り線を示せます。
読む側は「どの block が parser を通り、どの block が preview renderer に届くのか」を 1 ページで確認できます。

## 将来の手動 regression sample として

このページは、新しい renderer や editor UX を追加するための実装ではありません。
既存の docs/content conventions だけで置ける公開サンプルとして、今後の手動確認に使えるようにしています。

特に次の観点を目視できます。

- `papyr-excalidraw` フェンスが通常の docs build で失われないこと
- rectangle、ellipse、arrow、text が preview で同じ scene として並ぶこと
- caption と周辺 Markdown が Excalidraw block の前後で自然に読めること

このページが壊れた場合、Markdown parser、docs content build、preview renderer のどこかで Excalidraw block の扱いが変わった可能性を疑えます。
