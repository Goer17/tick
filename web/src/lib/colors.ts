export const PALETTE = [
  "#d97757",
  "#e08a4f",
  "#d6a84a",
  "#b5b04a",
  "#88a85a",
  "#5fa47a",
  "#4fa39a",
  "#56a1b5",
  "#5b8fc4",
  "#6f7fc4",
  "#8a7ac6",
  "#a875bf",
  "#bf76a8",
  "#c9788d",
  "#bd7a70",
  "#a6856b",
  "#8b8f91",
  "#7d9a8a",
];

export function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? PALETTE[0];
}
