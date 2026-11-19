import { drinks, type DrinkId, type Layer } from "./drinks";
import { CAPACITY, totalVolume } from "./engine";
export type HiddenRecipe = {
  id: string;
  name: string;
  ratios: Partial<Record<DrinkId, number>>;
  tolerance: number;
  minimumVolume: number;
  hint: string;
  description: string;
  priority: number;
};
const define = (
  id: string,
  name: string,
  ratios: HiddenRecipe["ratios"],
  hint: string,
  description: string,
  priority = 10,
  minimumVolume = 100,
): HiddenRecipe => ({
  id,
  name,
  ratios,
  hint,
  description,
  priority,
  minimumVolume,
  tolerance: 5,
});
export const hiddenRecipes: HiddenRecipe[] = [
  define(
    "forest-cola",
    "こもれびコーラ",
    { cola: 50, melon: 50 },
    "茶色のしゅわしゅわと、緑のしゅわしゅわを半分ずつ。",
    "森の木かげで見つけた、ちょっぴり不思議なソーダ。",
  ),
  define(
    "cloud-melon",
    "雲のメロンフロート",
    { melon: 60, calpis: 40 },
    "緑のソーダを6、白い飲み物を4。雲を浮かべて。",
    "メロン色の空に、まろやかな白い雲がぷかぷか。",
  ),
  define(
    "sunset",
    "ゆうやけフルーツ",
    { orange: 50, grape: 50 },
    "オレンジ色とむらさき色の果汁を、同じ量で。",
    "グラスの中に、帰り道の夕焼けを閉じこめたよ。",
  ),
  define(
    "night-cola",
    "夜ふかしコーラ",
    { cola: 70, coffee: 30 },
    "コーラ7に、ほろ苦い一杯を3。",
    "しゅわっと目が覚める、夜のラボの秘密の色。",
  ),
  define(
    "apple-spark",
    "りんごの金色スパーク",
    { apple: 60, ginger: 40 },
    "りんご6に、金色の炭酸4を添えて。",
    "りんごの果樹園で、金色の泡が踊りだす。",
  ),
  define(
    "tea-cloud",
    "ほうじ色のミルキー雲",
    { oolong: 60, calpis: 40 },
    "香ばしいお茶6、白い飲み物4。",
    "お茶の色に雲がとけた、のんびりおやつの時間。",
  ),
  define(
    "orange-cloud",
    "おひさまラッシー",
    { orange: 50, calpis: 50 },
    "オレンジと白を半分ずつ。おひさまをまろやかに。",
    "やさしいオレンジ色が、今日の気分を明るくする。",
  ),
  define(
    "grape-spark",
    "ぶどう星のソーダ",
    { grape: 60, ginger: 40 },
    "ぶどう6、金色の炭酸4。星をはじけさせよう。",
    "ぶどう色の宇宙で、小さな星がしゅわしゅわ。",
  ),
  define(
    "cola-cloud",
    "もくもくコーラ",
    { cola: 60, calpis: 40 },
    "コーラ6に、白い雲を4。",
    "いつものコーラが、ふんわりおめかし。",
  ),
  define(
    "tropical",
    "トロピカルひだまり",
    { melon: 50, orange: 50 },
    "メロンとオレンジ。ふたつの太陽を半分ずつ。",
    "緑とオレンジが出会って、南の島の昼下がりに。",
  ),
  define(
    "soda-trio",
    "しゅわしゅわ三銃士",
    { cola: 40, melon: 30, ginger: 30 },
    "炭酸3兄弟。コーラ4、メロン3、ジンジャー3。",
    "3つの泡が集まれば、ラボでいちばんにぎやかな一杯。",
    20,
  ),
  define(
    "fruit-trio",
    "くだものピクニック",
    { orange: 40, grape: 30, apple: 30 },
    "果汁3兄弟。オレンジ4、ぶどう3、りんご3。",
    "くだものをかごいっぱいに詰めた、おでかけの色。",
    20,
  ),
  define(
    "four-leaf",
    "四つ葉のしあわせ",
    { melon: 25, calpis: 25, apple: 25, ginger: 25 },
    "メロン・白・りんご・ジンジャー。4つを同じ量ずつ。",
    "4枚の葉っぱをそろえたら、小さなしあわせが完成。",
    30,
  ),
  define(
    "all-stars",
    "ラボのにじいろパレード",
    Object.fromEntries(drinks.map((d) => [d.id, 10])),
    "10種類ぜんぶを、同じ量ずつ。ラボのみんなが主役！",
    "すべての色が集まった、あなただけのパレード。",
    50,
  ),
  define(
    "pure-water",
    "とうめいの宝石",
    { water: 100 },
    "ほかには何も入れず、水だけでグラスをいっぱいに。",
    "混ぜない勇気も、立派な実験。300mlの澄んだ宝石。",
    100,
    300,
  ),
];
export function ingredients(layers: readonly Layer[]): Layer[] {
  return drinks
    .map((d) => ({
      drinkId: d.id,
      ml: layers
        .filter((l) => l.drinkId === d.id)
        .reduce((sum, l) => sum + l.ml, 0),
    }))
    .filter((l) => l.ml > 0);
}
export function matchHiddenRecipe(
  layers: readonly Layer[],
  recipes = hiddenRecipes,
): HiddenRecipe | undefined {
  const total = totalVolume(layers);
  if (
    !total ||
    total > CAPACITY + 1e-7 ||
    layers.some((l) => !Number.isFinite(l.ml) || l.ml <= 0)
  )
    return;
  const amounts = ingredients(layers);
  return [...recipes]
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .find(
      (recipe) =>
        total + 1e-7 >= recipe.minimumVolume &&
        layers.every((l) => Object.hasOwn(recipe.ratios, l.drinkId)) &&
        Object.entries(recipe.ratios).every(([id, ratio]) => {
          const ml = amounts.find((l) => l.drinkId === id)?.ml ?? 0;
          return (
            ml > 0 &&
            Math.abs((ml / total) * 100 - ratio!) <= recipe.tolerance + 1e-7
          );
        }),
    );
}
export const targetLayers = (recipe: HiddenRecipe): Layer[] =>
  Object.entries(recipe.ratios).map(([drinkId, ratio]) => ({
    drinkId: drinkId as DrinkId,
    ml: (ratio! / 100) * recipe.minimumVolume,
  }));
