// 从 talent-grid/src/components/GridBoard.tsx 迁移
// 支持外部传入 labels，适配 dimension_scores

import type { Person, GridCellData } from "../../types";
import { buildGrid } from "../../utils/grid";
import { DEFAULT_LABELS } from "../../data/labels";
import { GridCell } from "./GridCell";

interface Props {
  title: string;
  people: Person[];
  xCols: string[];
  yCols: string[];
  labels?: string[][];
  onPersonClick: (person: Person) => void;
}

const X_LEVELS = ["低", "中", "高"];
const Y_LEVELS = ["高", "中", "低"];

export function GridBoard({ title, people, xCols, yCols, labels, onPersonClick }: Props) {
  const cellLabels = labels || DEFAULT_LABELS;
  const cells: GridCellData[] = buildGrid(people, xCols, yCols, cellLabels);

  const xName = xCols.length === 1 ? xCols[0] : xCols.join("+");
  const yName = yCols.length === 1 ? yCols[0] : yCols.join("+");

  return (
    <div className="grid-board-wrapper">
      <h3 className="grid-title">{title}</h3>

      <div className="grid-layout">
        <div className="y-axis-name">{yName}</div>

        <div className="grid-main">
          <div className="grid-board">
            {/* 顶部 X 轴刻度 */}
            <div className="grid-corner"></div>
            {X_LEVELS.map((label) => (
              <div key={`x-${label}`} className="axis-label x-label-top">
                {label}
              </div>
            ))}
            <div className="grid-corner"></div>

            {/* 数据行 */}
            {Y_LEVELS.map((yLabel, yi) => (
              <>
                <div key={`yl-${yLabel}`} className="axis-label y-label-left">
                  {yLabel}
                </div>
                {X_LEVELS.map((_xLabel, xi) => {
                  const cell = cells[yi * 3 + xi];
                  return (
                    <GridCell
                      key={`${_xLabel}-${yLabel}`}
                      cell={cell}
                      onPersonClick={onPersonClick}
                    />
                  );
                })}
                <div key={`yr-${yLabel}`} className="axis-label y-label-right">
                  {yLabel}
                </div>
              </>
            ))}
          </div>

          <div className="x-axis-name">{xName} →</div>
        </div>
      </div>
    </div>
  );
}
