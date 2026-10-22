// 从 talent-grid/src/utils/grid.ts 迁移
// 适配新的 Person 类型（支持 dimension_scores）

import type { Person, ScoreLevel, GridCellData } from "../types";

export function getScoreLevel(score: number): ScoreLevel {
  if (score <= 2.5) return "低";
  if (score <= 3.5) return "中";
  return "高";
}

/**
 * 计算某人在一组维度上的平均分
 * 支持旧 Excel 模式（scores 字段）和新汇总模式（dimension_scores 字段）
 */
export function getAvgScore(person: Person, cols: string[]): number {
  if (cols.length === 0) return 0;

  // 优先使用 dimension_scores（新汇总模式）
  const scoreSource = Object.keys(person.dimension_scores).length > 0
    ? person.dimension_scores
    : person.scores;

  const sum = cols.reduce((acc, col) => acc + (scoreSource[col] ?? 0), 0);
  return sum / cols.length;
}

/**
 * 将人员数据按 X/Y 轴维度归类到九宫格
 * X轴视觉顺序：左→右 = 低→中→高
 * Y轴视觉顺序：上→下 = 高→中→低
 */
export function buildGrid(
  people: Person[],
  xCols: string[],
  yCols: string[],
  labels: string[][]
): GridCellData[] {
  const xLevels: ScoreLevel[] = ["低", "中", "高"];
  const yLevels: ScoreLevel[] = ["高", "中", "低"];

  const cells: GridCellData[] = [];

  for (let yi = 0; yi < 3; yi++) {
    for (let xi = 0; xi < 3; xi++) {
      const xLevel = xLevels[xi];
      const yLevel = yLevels[yi];

      const cellPeople = people.filter((p) => {
        const xScore = getAvgScore(p, xCols);
        const yScore = getAvgScore(p, yCols);
        return getScoreLevel(xScore) === xLevel && getScoreLevel(yScore) === yLevel;
      });

      cells.push({
        xLevel,
        yLevel,
        label: labels[yi][xi],
        people: cellPeople,
      });
    }
  }

  return cells;
}

/**
 * 按分组字段将人员分组
 */
export function groupPeople(
  people: Person[],
  groupColumn: string
): Map<string, Person[]> {
  const groups = new Map<string, Person[]>();
  for (const p of people) {
    const key = p.groups[groupColumn] || "未分类";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return new Map([...groups.entries()].sort());
}
