import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import type { Questionnaire } from "../types";

export function AdminHome() {
  const { user, logout } = useAuth();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listQuestionnaires()
      .then(setQuestionnaires)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusLabel: Record<string, string> = {
    draft: "草稿",
    published: "已发布",
    archived: "已归档",
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>人才盘点 — 管理后台</h1>
        <div className="user-info">
          <span>{user?.name}</span>
          <button onClick={logout}>退出</button>
        </div>
      </header>
      <main className="page-body">
        <div className="page-actions">
          <Link to="/admin/questionnaires/new" className="btn-primary">
            + 创建新问卷
          </Link>
        </div>

        {loading ? (
          <p>加载中...</p>
        ) : questionnaires.length === 0 ? (
          <div className="empty-state">
            <p>暂无问卷，点击上方按钮创建第一份问卷。</p>
          </div>
        ) : (
          <div className="card-list">
            {questionnaires.map((q) => (
              <Link to={`/admin/questionnaires/${q.id}`} key={q.id} className="card-item">
                <div className="card-item-header">
                  <h3>{q.title}</h3>
                  <span className={`status-tag status-${q.status}`}>
                    {statusLabel[q.status] || q.status}
                  </span>
                </div>
                {q.description && <p className="card-desc">{q.description}</p>}
                <div className="card-meta">
                  <span>创建于 {new Date(q.created_at).toLocaleDateString("zh-CN")}</span>
                  {q.published_at && (
                    <span> | 发布于 {new Date(q.published_at).toLocaleDateString("zh-CN")}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
