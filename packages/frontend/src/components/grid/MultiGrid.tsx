// 从 talent-grid/src/components/MultiGrid.tsx 迁移（几乎不改）

import type { Person } from "../../types";
import { groupPeople } from "../../utils/grid";
import { GridBoard } from "./GridBoard";

interface Props {
  people: Person[];
  filterType: "all" | "group";
  filterGroupColumn: string;
  xCols: string[];
  yCols: string[];
  onPersonClick: (person: Person) => void;
}

export function MultiGrid({
  people,
  filterType,
  filterGroupColumn,
  xCols,
  yCols,
  onPersonClick,
}: Props) {
  if (filterType === "all") {
    return (
      <div className="multi-grid">
        <GridBoard
          title="整体"
          people={people}
          xCols={xCols}
          yCols={yCols}
          onPersonClick={onPersonClick}
        />
      </div>
    );
  }

  const groups = groupPeople(people, filterGroupColumn);

  if (groups.size === 0) {
    return <div className="empty-message">当前筛选条件无数据</div>;
  }

  return (
    <div className="multi-grid scrollable">
      {Array.from(groups.entries()).map(([groupName, groupPeople]) => (
        <GridBoard
          key={groupName}
          title={groupName}
          people={groupPeople}
          xCols={xCols}
          yCols={yCols}
          onPersonClick={onPersonClick}
        />
      ))}
    </div>
  );
}
