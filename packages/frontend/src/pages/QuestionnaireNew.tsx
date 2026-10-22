import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface IndicatorInput {
  key: string;
  name: string;
  weight: number;
  level_desc: Record<string, string>;
}

interface DimensionInput {
  key: string;
  name: string;
  indicators: IndicatorInput[];
}

let keyCounter = 0;

export function QuestionnaireNew() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dimensions, setDimensions] = useState<DimensionInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addDimension() {
    setDimensions([
      ...dimensions,
      {
        key: `dim_${++keyCounter}`,
        name: "",
        indicators: [
          { key: `ind_${++keyCounter}`, name: "", weight: 100, level_desc: {} },
        ],
      },
    ]);
  }

  function removeDimension(dimKey: string) {
    setDimensions(dimensions.filter((d) => d.key !== dimKey));
  }

  function updateDimension(key: string, field: keyof DimensionInput, value: unknown) {
    setDimensions(dimensions.map((d) => (d.key === key ? { ...d, [field]: value } : d)));
  }

  function addIndicator(dimKey: string) {
    setDimensions(
      dimensions.map((d) =>
        d.key === dimKey
          ? {
              ...d,
              indicators: [
                ...d.indicators,
                { key: `ind_${++keyCounter}`, name: "", weight: 0, level_desc: {} },
              ],
            }
          : d
      )
    );
  }

  function removeIndicator(dimKey: string, indKey: string) {
    setDimensions(
      dimensions.map((d) =>
        d.key === dimKey
          ? { ...d, indicators: d.indicators.filter((i) => i.key !== indKey) }
          : d
      )
    );
  }

  function updateIndicator(
    dimKey: string,
    indKey: string,
    field: keyof IndicatorInput,
    value: unknown
  ) {
    setDimensions(
      dimensions.map((d) =>
        d.key === dimKey
          ? {
              ...d,
              indicators: d.indicators.map((i) =>
                i.key === indKey ? { ...i, [field]: value } : i
              ),
            }
          : d
      )
    );
  }

  async function handleSubmit() {
    setError(null);

    // 基础校验
    if (!title.trim()) {
      setError("请输入问卷标题");
      return;
    }
    if (dimensions.length === 0) {
      setError("至少添加一个大维度");
      return;
    }

    for (const dim of dimensions) {
      if (!dim.name.trim()) {
        setError("所有维度名称不能为空");
        return;
      }
      if (dim.indicators.length === 0) {
        setError(`维度"${dim.name}"下至少需要一个指标`);
        return;
      }
      const totalWeight = dim.indicators.reduce((s, i) => s + i.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        setError(`维度"${dim.name}"的指标权重之和为 ${totalWeight}%，需要等于 100%`);
        return;
      }
      for (const ind of dim.indicators) {
        if (!ind.name.trim()) {
          setError(`维度"${dim.name}"下存在指标名称为空`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      await api.createQuestionnaire({
        title: title.trim(),
        description: description.trim() || undefined,
        dimensions: dimensions.map((d, di) => ({
          name: d.name.trim(),
          sort_order: di,
          indicators: d.indicators.map((ind, ii) => ({
            name: ind.name.trim(),
            weight: ind.weight,
            sort_order: ii,
            level_desc: ind.level_desc,
          })),
        })),
      });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>创建新问卷</h1>
        <button className="btn-secondary" onClick={() => navigate("/admin")}>
          返回
        </button>
      </header>
      <main className="page-body">
        <div className="form-section">
          <label className="form-label">问卷标题</label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：2025 Q3 人才盘点"
          />
        </div>

        <div className="form-section">
          <label className="form-label">描述（可选）</label>
          <textarea
            className="form-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="问卷说明..."
            rows={2}
          />
        </div>

        <div className="form-section">
          <div className="form-label-row">
            <label className="form-label">评价维度</label>
            <button className="btn-small" onClick={addDimension}>
              + 添加维度
            </button>
          </div>

          {dimensions.map((dim, dimIdx) => (
            <div key={dim.key} className="dimension-card">
              <div className="dimension-header">
                <span className="dimension-number">维度 {dimIdx + 1}</span>
                <input
                  type="text"
                  className="form-input"
                  value={dim.name}
                  onChange={(e) => updateDimension(dim.key, "name", e.target.value)}
                  placeholder="维度名称，如：业务能力"
                />
                <button
                  className="btn-danger-small"
                  onClick={() => removeDimension(dim.key)}
                >
                  删除
                </button>
              </div>

              <div className="indicator-list">
                {dim.indicators.map((ind, indIdx) => (
                  <div key={ind.key} className="indicator-row">
                    <span className="indicator-number">{indIdx + 1}</span>
                    <input
                      type="text"
                      className="form-input"
                      value={ind.name}
                      onChange={(e) =>
                        updateIndicator(dim.key, ind.key, "name", e.target.value)
                      }
                      placeholder="指标名称"
                    />
                    <input
                      type="number"
                      className="form-input weight-input"
                      value={ind.weight || ""}
                      onChange={(e) =>
                        updateIndicator(
                          dim.key,
                          ind.key,
                          "weight",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="权重%"
                      min={0}
                      max={100}
                    />
                    <span>%</span>

                    {/* 分级描述 */}
                    <div className="level-desc-group">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <input
                          key={level}
                          type="text"
                          className="form-input level-input"
                          value={ind.level_desc[String(level)] || ""}
                          onChange={(e) =>
                            updateIndicator(dim.key, ind.key, "level_desc", {
                              ...ind.level_desc,
                              [String(level)]: e.target.value,
                            })
                          }
                          placeholder={`${level}分描述`}
                        />
                      ))}
                    </div>

                    {dim.indicators.length > 1 && (
                      <button
                        className="btn-danger-small"
                        onClick={() => removeIndicator(dim.key, ind.key)}
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}

                <button
                  className="btn-small"
                  onClick={() => addIndicator(dim.key)}
                >
                  + 添加指标
                </button>
              </div>

              <div className="weight-sum">
                权重合计:{" "}
                {dim.indicators.reduce((s, i) => s + i.weight, 0)}%
              </div>
            </div>
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "创建中..." : "创建问卷"}
          </button>
        </div>
      </main>
    </div>
  );
}
