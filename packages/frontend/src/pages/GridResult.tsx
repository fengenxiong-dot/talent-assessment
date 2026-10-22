import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { MultiGrid } from "../components/grid/MultiGrid";
import { PersonCard } from "../components/grid/PersonCard";
import type { Person, GridCellData, AggregationResult } from "../types";

export function GridResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [aggData, setAggData] = useState<AggregationResult | null>(null);
  const [gridData, setGridData] = useState<GridCellData[] | null>(null);
  const [xDim, setXDim] = useState("");
  const [yDim, setYDim] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getAggregation(id)
      .then((data) => {
        setAggData(data);
        if (data.dimension_names.length >= 2) {
          setXDim(data.dimension_names[0]);
          setYDim(data.dimension_names[1]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !xDim || !yDim) return;
    api
      .getGrid(id, xDim, yDim)
      .then((data) => setGridData(data.cells))
      .catch(console.error);
  }, [id, xDim, yDim]);

  if (loading) return <div className="loading-screen"><p>加载中...</p></div>;
  if (!aggData || aggData.people.length === 0) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>九宫格</h1>
          <button className="btn-secondary" onClick={() => navigate(`/admin/questionnaires/${id}`)}>
            返回问卷
          </button>
        </header>
        <main className="page-body">
          <p>暂无评价数据，请等待评价人提交评分。</p>
        </main>
      </div>
    );
  }

  // 将 AggregationResult 的人转换为 Person 格式
  const people: Person[] = aggData.people.map((p) => ({
    user_id: p.user_id,
    name: p.name,
    groups: p.groups,
    scores: p.dimension_scores,
    dimension_scores: p.dimension_scores,
  }));

  return (
    <div className="page">
      <header className="page-header">
        <h1>九宫格结果</h1>
        <button className="btn-secondary" onClick={() => navigate(`/admin/questionnaires/${id}`)}>
          返回问卷
        </button>
      </header>

      <main className="page-body">
        {/* 维度选择器 */}
        <div className="section">
          <div className="dim-picker">
            <div className="dim-picker-item">
              <label>X 轴（横轴）:</label>
              <select value={xDim} onChange={(e) => setXDim(e.target.value)}>
                {aggData.dimension_names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="dim-picker-item">
              <label>Y 轴（纵轴）:</label>
              <select value={yDim} onChange={(e) => setYDim(e.target.value)}>
                {aggData.dimension_names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 九宫格 */}
        {gridData && (
          <MultiGrid
            people={people}
            filterType="all"
            filterGroupColumn=""
            xCols={[xDim]}
            yCols={[yDim]}
            onPersonClick={setSelectedPerson}
          />
        )}

        {/* 人员详情 Modal */}
        {selectedPerson && (
          <PersonCard
            person={selectedPerson}
            scoreColumns={aggData.dimension_names}
            groupColumns={[]}
            onClose={() => setSelectedPerson(null)}
          />
        )}
      </main>
    </div>
  );
}
