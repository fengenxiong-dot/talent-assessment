import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import type { EvaluationRelation } from "../types";

export function EvaluatorHome() {
  const { user, logout } = useAuth();
  const [evaluations, setEvaluations] = useState<EvaluationRelation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMyEvaluations()
      .then(setEvaluations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pending = evaluations.filter((e) => e.status === "pending");
  const submitted = evaluations.filter((e) => e.status === "submitted");

  return (
    <div className="page">
      <header className="page-header">
        <h1>我的评价</h1>
        <div className="user-info">
          <span>{user?.name}</span>
          <button onClick={logout}>退出</button>
        </div>
      </header>

      <main className="page-body">
        {loading ? (
          <p>加载中...</p>
        ) : evaluations.length === 0 ? (
          <div className="empty-state">
            <p>暂无待评价对象。</p>
          </div>
        ) : (
          <>
            {/* 待评 */}
            {pending.length > 0 && (
              <div className="section">
                <h2>待评价 ({pending.length})</h2>
                <div className="card-list">
                  {pending.map((e) => (
                    <Link
                      to={`/evaluator/score/${e.id}`}
                      key={e.id}
                      className="card-item"
                    >
                      <div className="card-item-header">
                        <h3>{e.target_name}</h3>
                        <span className="status-tag status-draft">待评</span>
                      </div>
                      <p className="card-desc">
                        {e.questionnaire_title} | 权重: {e.evaluator_weight}%
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 已评 */}
            {submitted.length > 0 && (
              <div className="section">
                <h2>已完成 ({submitted.length})</h2>
                <div className="card-list">
                  {submitted.map((e) => (
                    <Link
                      to={`/evaluator/score/${e.id}`}
                      key={e.id}
                      className="card-item card-item-submitted"
                    >
                      <div className="card-item-header">
                        <h3>{e.target_name}</h3>
                        <span className="status-tag status-published">已提交</span>
                      </div>
                      <p className="card-desc">
                        {e.questionnaire_title}
                        {e.submitted_at &&
                          ` | 提交于 ${new Date(e.submitted_at).toLocaleString("zh-CN")}`}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
