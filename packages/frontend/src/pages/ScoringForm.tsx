import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Dimension as DimType } from "../types";

interface ScoreFormDim extends DimType {
  indicators: (DimType["indicators"][number] & { current_score: number | null })[];
}

interface FormData {
  relation: {
    id: string;
    target_name: string;
    questionnaire_title: string;
    evaluator_weight: number;
    status: string;
  };
  dimensions: ScoreFormDim[];
}

export function ScoringForm() {
  const { relationId } = useParams<{ relationId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!relationId) return;
    api
      .getScoreForm(relationId)
      .then((data) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFormData(data as any);

        // 回填已有分数
        const existing: Record<string, number> = {};
        for (const dim of data.dimensions) {
          for (const ind of dim.indicators) {
            const currentScore = (ind as Record<string, unknown>).current_score as number | null;
            if (currentScore !== null) {
              existing[ind.id] = currentScore;
            }
          }
        }
        setScores(existing);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [relationId]);

  function setScore(indicatorId: string, score: number) {
    setScores((prev) => ({ ...prev, [indicatorId]: score }));
  }

  async function handleSubmit() {
    if (!relationId) return;
    setError(null);

    // 校验：所有指标都要打分
    if (!formData) return;
    const allIndicatorIds = formData.dimensions.flatMap((d) =>
      d.indicators.map((i) => i.id)
    );
    const missing = allIndicatorIds.filter((id) => scores[id] == null);
    if (missing.length > 0) {
      setError(`还有 ${missing.length} 项指标未打分`);
      return;
    }

    setSubmitting(true);
    try {
      await api.submitScores(
        relationId,
        allIndicatorIds.map((id) => ({ indicator_id: id, score: scores[id] }))
      );
      alert("提交成功");
      navigate("/evaluator", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading-screen"><p>加载中...</p></div>;
  if (error && !formData)
    return <div className="error-screen"><p>{error}</p></div>;
  if (!formData) return null;

  return (
    <div className="page">
      <header className="page-header">
        <h1>评价: {formData.relation.target_name}</h1>
        <button className="btn-secondary" onClick={() => navigate("/evaluator")}>
          返回
        </button>
      </header>

      <main className="page-body">
        <div className="section">
          <p>
            问卷: {formData.relation.questionnaire_title} | 权重:{" "}
            {formData.relation.evaluator_weight}%
          </p>
          {formData.relation.status === "submitted" && (
            <p className="text-warning">你已提交过评价，再次提交将覆盖之前的结果。</p>
          )}
        </div>

        {formData.dimensions.map((dim) => (
          <div key={dim.id} className="section">
            <h2>{dim.name}</h2>
            <div className="scoring-table">
              <table className="card-table">
                <thead>
                  <tr>
                    <th>指标</th>
                    <th>分级描述</th>
                    <th>权重</th>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <th key={score} className="score-col">{score}分</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dim.indicators.map((ind) => (
                    <tr key={ind.id}>
                      <td className="ind-name">{ind.name}</td>
                      <td className="level-desc-cell">
                        {Object.entries((ind.level_desc || {}) as Record<string, string>)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .map(([level, desc]) => (
                            <span key={level} className="level-item">
                              {level}: {desc}
                            </span>
                          ))}
                      </td>
                      <td>{ind.weight}%</td>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <td key={score} className="score-col">
                          <label className="radio-cell">
                            <input
                              type="radio"
                              name={`ind_${ind.id}`}
                              value={score}
                              checked={scores[ind.id] === score}
                              onChange={() => setScore(ind.id, score)}
                            />
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button
            className="btn-primary btn-large"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "提交中..." : "提交评分"}
          </button>
        </div>
      </main>
    </div>
  );
}
