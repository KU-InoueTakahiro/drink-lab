export const drinks = [
  { id: 'cola', name: 'コーラ', color: '#713D37', icon: '✦', note: 'しゅわっと、定番。' },
  { id: 'melon', name: 'メロンソーダ', color: '#62CF98', icon: '✧', note: 'はじける、みどり。' },
  { id: 'orange', name: 'オレンジジュース', color: '#FFA638', icon: '☀', note: 'ぎゅっと、果実。' },
  { id: 'calpis', name: 'カルピス', color: '#F1F0DF', icon: '●', note: 'やさしい、まろやか。' },
  { id: 'oolong', name: 'ウーロン茶', color: '#AF773F', icon: '❧', note: 'すっきり、香ばしく。' },
  { id: 'ginger', name: 'ジンジャーエール', color: '#E7C65A', icon: '✦', note: 'ぴりっと、爽やか。' },
  { id: 'grape', name: 'グレープジュース', color: '#9C6BB7', icon: '♣', note: 'こっくり、むらさき。' },
  { id: 'coffee', name: 'アイスコーヒー', color: '#634238', icon: '☕', note: 'ほろ苦い、ひと息。' },
  { id: 'apple', name: 'アップルジュース', color: '#EDBB62', icon: '♥', note: 'ふんわり、甘ずっぱい。' },
  { id: 'water', name: '水', color: '#B9E2EC', icon: '◒', note: 'きらきら、クリア。' },
] as const;
export const carbonatedDrinks = new Set(['cola', 'melon', 'ginger']);
export type DrinkId = typeof drinks[number]['id'];
export type Layer = { drinkId: DrinkId; ml: number };
