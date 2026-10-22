import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { UploadArea } from "../components/UploadArea";
import type { Questionnaire, EvaluationRelation } from "../types";

export function QuestionnaireDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState<Questionnaire | null>(null);
  const [relations, setRelations] = useState<EvaluationRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [pushing, setPushing] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [questionnaire, rels] = await Promise.all([
        api.getQuestionnaire(id),
        api.getRelations(id),
      ]);
      setQ(questionnaire);
      setRelations(rels);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpload(file: File) {
    if (!id) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const result = await api.uploadRelations(id, file);
      setUploadResult(result);
      await loadData();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handlePublish() {
    if (!id) return;
    try {
      await api.publishQuestionnaire(id);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "发布失败");
    }
  }

  async function handlePush() {
    if (!id) return;
    setPushing(true);
    try {
      const result = await api.pushNotifications(id);
      alert(`钉钉已受理 ${result.count} 名评价人的通知，任务ID：${result.task_ids.join(", ")}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "推送失败");
    } finally {
      setPushing(false);
    }
  }

  async function handleSyncContacts() {
    setSyncingContacts(true);
    try {
      const result = await api.syncContacts();
      alert(result.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : "同步通讯录失败");
    } finally {
      setSyncingContacts(false);
    }
  }

  if (loading) return <div className="loading-screen"><p>加载中...</p></div>;
  if (!q) return <div className="error-screen"><p>问卷不存在</p></div>;

  const isDraft = q.status === "draft";
  const isPublished = q.status === "published";

  return (
    <div className="page">
      <header className="page-header">
        <h1>{q.title}</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate("/admin")}>
            返回列表
          </button>
        </div>
      </header>

      <main className="page-body">
        {/* 问卷信息 */}
        <div className="section">
          <div className="section-header">
            <h2>问卷信息</h2>
            <span className={`status-tag status-${q.status}`}>
              {q.status === "draft" ? "草稿" : q.status === "published" ? "已发布" : "已归档"}
            </span>
          </div>
          {q.description && <p className="section-desc">{q.description}</p>}

          {/* 维度 + 指标 */}
          <div className="dimensions-view">
            {q.dimensions.map((dim) => (
              <div key={dim.id} className="view-dimension">
                <h3>{dim.name}</h3>
                <table className="card-table">
                  <thead>
                    <tr>
                      <th>指标</th>
                      <th>权重</th>
                      <th>分级描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dim.indicators.map((ind) => (
                      <tr key={ind.id}>
                        <td>{ind.name}</td>
                        <td>{ind.weight}%</td>
                        <td className="level-desc-cell">
                          {Object.entries(ind.level_desc as Record<string, string>)
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([level, desc]) => (
                              <span key={level} className="level-item">
                                {level}分: {desc}
                              </span>
                            ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="weight-check">
                  权重合计: {dim.indicators.reduce((s, i) => s + i.weight, 0)}%
                </div>
              </div>
            ))}
          </div>

          {isDraft && (
            <button className="btn-primary" onClick={handlePublish} style={{ marginTop: 16 }}>
              发布问卷（发布后不可修改）
            </button>
          )}
        </div>

        {/* 评价关系管理 */}
        {isPublished && (
          <>
            <div className="section">
              <div className="section-header">
                <h2>导入评价关系</h2>
                <button
                  className="btn-secondary"
                  onClick={handleSyncContacts}
                  disabled={syncingContacts}
                >
                  {syncingContacts ? "同步中..." : "同步钉钉通讯录"}
                </button>
              </div>
              <p className="section-hint">
                Excel 格式：被评价人工号、被评价人姓名、评价人1工号、评价人1姓名、评价人2工号、评价人2姓名（后两列可选）
              </p>
              <UploadArea
                onUpload={handleUpload}
                loading={uploading}
                error={uploadError}
                fileName={null}
              />
              {uploadResult && (
                <div className="upload-result">
                  <p>新增 {uploadResult.created} 条，跳过 {uploadResult.skipped} 条</p>
                  {uploadResult.errors.length > 0 && (
                    <div className="upload-errors">
                      {uploadResult.errors.map((e, i) => (
                        <p key={i} className="text-danger">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 评价关系列表 */}
            {relations.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <h2>评价关系 ({relations.length} 条)</h2>
                  <button
                    className="btn-primary"
                    onClick={handlePush}
                    disabled={pushing}
                  >
                    {pushing ? "推送中..." : "推送评价通知"}
                  </button>
                </div>
                <table className="card-table">
                  <thead>
                    <tr>
                      <th>被评价人</th>
                      <th>评价人</th>
                      <th>权重</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relations.map((r) => (
                      <tr key={r.id}>
                        <td>{r.target_name}</td>
                        <td>{r.evaluator_name}</td>
                        <td>{r.evaluator_weight}%</td>
                        <td>
                          <span className={`status-tag status-${r.status === "submitted" ? "published" : "draft"}`}>
                            {r.status === "submitted" ? "已提交" : "待评"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 操作按钮 */}
            {relations.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <h2>查看结果</h2>
                </div>
                <div className="action-buttons">
                  <Link to={`/admin/questionnaires/${id}/grid`} className="btn-primary">
                    查看九宫格
                  </Link>
                  <Link to={`/admin/questionnaires/${id}/progress`} className="btn-secondary">
                    查看进度
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
