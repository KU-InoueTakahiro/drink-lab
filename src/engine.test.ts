import { describe, expect, it } from 'vitest';
import { mixColor, pour, totalVolume, RATE } from './engine';
describe('注入・容量',()=>{
 it('毎秒60ml注ぐ',()=>expect(totalVolume(pour([], 'cola', RATE * 2))).toBe(120));
 it('300mlで止まる',()=>expect(totalVolume(pour([{drinkId:'cola',ml:299}], 'water', 60))).toBe(300));
 it('満杯なら追加しない',()=>expect(pour([{drinkId:'cola',ml:300}],'water',5)).toEqual([{drinkId:'cola',ml:300}]));
 it('同種はまとめ、交互なら層を残す',()=>{let x=pour([], 'cola', 5);x=pour(x,'cola',5);x=pour(x,'water',5);x=pour(x,'cola',5);expect(x).toEqual([{drinkId:'cola',ml:10},{drinkId:'water',ml:5},{drinkId:'cola',ml:5}]);});
 it('元の配列を変えず履歴に戻せる',()=>{const before=[{drinkId:'cola' as const,ml:25}];pour(before,'cola',30);expect(totalVolume(before)).toBe(25);});
 it('負数と不正な注入量を無視する',()=>{expect(pour([],'water',-1)).toEqual([]);expect(pour([],'water',NaN)).toEqual([]);});
});
describe('RGB加重平均',()=>{
 it('空なら白',()=>expect(mixColor([])).toBe('#FFFFFF'));
 it('単一材料は基本色',()=>expect(mixColor([{drinkId:'melon',ml:10}])).toBe('#62CF98'));
 it('量で加重平均する',()=>expect(mixColor([{drinkId:'cola',ml:100},{drinkId:'water',ml:200}])).toBe('#A1ABB0'));
 it('注入順によらない',()=>{const a=[{drinkId:'cola' as const,ml:20},{drinkId:'water' as const,ml:80}];expect(mixColor(a)).toBe(mixColor([...a].reverse()));});
});
