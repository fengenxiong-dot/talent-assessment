import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { ProgressResult } from "../types";

export function ProgressDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProgressResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .getProgress(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-screen"><p>加载中...</p></div>;
  if (!data) return <div className="error-screen"><p>无法加载进度数据</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>评价进度</h1>
        <button className="btn-secondary" onClick={() => navigate(`/admin/questionnaires/${id}`)}>
          返回问卷
        </button>
      </header>

      <main className="page-body">
        <div className="section">
          <div className="progress-overview">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${data.percentage}%` }}
              />
            </div>
            <div className="progress-text">
              {data.submitted} / {data.total} 已提交 ({data.percentage}%)
            </div>
          </div>
        </div>

        <div className="section">
          <h2>评价明细</h2>
          <table className="card-table">
            <thead>
              <tr>
                <th>评价人</th>
                <th>被评价人</th>
                <th>状态</th>
                <th>提交时间</th>
              </tr>
            </thead>
            <tbody>
              {data.details.map((d, i) => (
                <tr key={i}>
                  <td>{d.evaluator_name}</td>
                  <td>{d.target_name}</td>
                  <td>
                    <span className={`status-tag status-${d.status === "submitted" ? "published" : "draft"}`}>
                      {d.status === "submitted" ? "已提交" : "待评"}
                    </span>
                  </td>
                  <td>
                    {d.submitted_at
                      ? new Date(d.submitted_at).toLocaleString("zh-CN")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
