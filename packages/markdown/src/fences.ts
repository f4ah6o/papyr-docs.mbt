export const PAPYR_TABLE_FENCE = "papyr-table";
export const PAPYR_MOONLIGHT_FENCE = "papyr-moonlight";
export const MERMAID_FENCE = "mermaid";

export type PapyrFenceLang =
  | typeof PAPYR_TABLE_FENCE
  | typeof PAPYR_MOONLIGHT_FENCE
  | typeof MERMAID_FENCE;

export function isPapyrFence(
  lang: string | null | undefined,
): lang is PapyrFenceLang {
  return (
    lang === PAPYR_TABLE_FENCE ||
    lang === PAPYR_MOONLIGHT_FENCE ||
    lang === MERMAID_FENCE
  );
}
