import { drinks, type Layer, type DrinkId } from './drinks';
export const CAPACITY = 300;
export const RATE = 60;
export const MIN_POUR = 5;
export const totalVolume = (layers: readonly Layer[]) => layers.reduce((sum, layer) => sum + layer.ml, 0);
export function pour(layers: readonly Layer[], drinkId: DrinkId, amount: number): Layer[] {
  const ml = Math.min(CAPACITY - totalVolume(layers), Math.max(0, Number.isFinite(amount) ? amount : 0));
  if (ml <= 0) return [...layers];
  const result = layers.map(layer => ({ ...layer }));
  if (result.at(-1)?.drinkId === drinkId) result[result.length - 1].ml += ml;
  else result.push({ drinkId, ml });
  return result;
}
export function mixColor(layers: readonly Layer[]): string {
  const total = totalVolume(layers);
  if (!total) return '#FFFFFF';
  const rgb = [0, 0, 0];
  for (const layer of layers) {
    const color = drinks.find(drink => drink.id === layer.drinkId)!.color;
    rgb.forEach((_, index) => { rgb[index] += parseInt(color.slice(1 + index * 2, 3 + index * 2), 16) * layer.ml; });
  }
  return '#' + rgb.map(value => Math.round(value / total).toString(16).padStart(2, '0')).join('').toUpperCase();
}
