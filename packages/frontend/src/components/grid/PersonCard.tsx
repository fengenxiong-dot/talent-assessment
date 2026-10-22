// 从 talent-grid/src/components/PersonCard.tsx 迁移
// 适配 dimension_scores

import type { Person } from "../../types";

interface Props {
  person: Person;
  scoreColumns: string[];
  groupColumns: string[];
  onClose: () => void;
}

export function PersonCard({ person, scoreColumns, groupColumns, onClose }: Props) {
  // 优先展示 dimension_scores，其次展示 scores
  const hasDimScores = Object.keys(person.dimension_scores).length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>{person.name}</h2>

        {groupColumns.length > 0 && (
          <div className="card-section">
            <table className="card-table">
              <tbody>
                {groupColumns.map((col) => (
                  <tr key={col}>
                    <td className="card-label">{col}</td>
                    <td>{person.groups[col] || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card-section">
          <h3>{hasDimScores ? "维度得分" : "评分详情"}</h3>
          <table className="card-table">
            <thead>
              <tr>
                <th>维度</th>
                <th>得分</th>
              </tr>
            </thead>
            <tbody>
              {hasDimScores
                ? Object.entries(person.dimension_scores).map(([dim, score]) => (
                    <tr key={dim}>
                      <td>{dim}</td>
                      <td className="score-value">{score.toFixed(2)}</td>
                    </tr>
                  ))
                : scoreColumns.map((col) => (
                    <tr key={col}>
                      <td>{col}</td>
                      <td className="score-value">{person.scores[col] ?? "-"}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
