import { useState, useRef, useCallback } from "react";
import type { GridCellData, Person } from "../../types";
import { CELL_COLORS } from "../../data/labels";

interface Props {
  cell: GridCellData;
  onPersonClick: (person: Person) => void;
}

export function GridCell({ cell, onPersonClick }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipAbove, setTooltipAbove] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const count = cell.people.length;
  const bgColor = CELL_COLORS[cell.label] || "#ffffff";

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
    // 检测是否需要向上弹出
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // 如果格子中心在视口下半部分，tooltip 向上弹出
      setTooltipAbove(rect.top + rect.height / 2 > viewportHeight / 2);
    }
  }, []);

  return (
    <div
      ref={cellRef}
      className="grid-cell"
      style={{ backgroundColor: bgColor }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="cell-label">{cell.label}</div>
      <div className="cell-count">{count} 人</div>

      {showTooltip && count > 0 && (
        <div
          className={`cell-tooltip ${tooltipAbove ? "tooltip-above" : ""}`}
        >
          {cell.people.map((p) => (
            <span
              key={p.name}
              className="tooltip-name"
              onClick={(e) => {
                e.stopPropagation();
                onPersonClick(p);
              }}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
