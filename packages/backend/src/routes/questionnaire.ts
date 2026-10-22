import { Router } from "express";
import { z } from "zod";
import { query, type QueryRow } from "../db.js";

const router = Router();

// 创建问卷 schema
const createSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  description: z.string().optional(),
  dimensions: z
    .array(
      z.object({
        name: z.string().min(1),
        sort_order: z.number().int().min(0).default(0),
        indicators: z
          .array(
            z.object({
              name: z.string().min(1),
              weight: z.number().min(0).max(100),
              sort_order: z.number().int().min(0).default(0),
              level_desc: z.record(z.string()).optional().default({}),
            })
          )
          .min(1, "每个维度至少需要一个指标"),
      })
    )
    .min(1, "至少需要一个维度"),
});

// GET /api/questionnaires
router.get("/", async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, title, description, status, created_by, published_at, created_at, updated_at
       FROM questionnaires
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("获取问卷列表失败:", err);
    res.status(500).json({ error: "获取问卷列表失败" });
  }
});

// POST /api/questionnaires
router.post("/", async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "参数无效" });
      return;
    }

    const { title, description, dimensions } = parsed.data;
    const userId = req.user!.user_id;

    // 校验每个大维度下的指标权重之和 = 100
    for (const dim of dimensions) {
      const totalWeight = dim.indicators.reduce((sum, ind) => sum + ind.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        res.status(400).json({
          error: `维度"${dim.name}"的指标权重之和为 ${totalWeight}%，需要等于 100%`,
        });
        return;
      }
    }

    // 创建问卷
    const qResult = await query(
      `INSERT INTO questionnaires (title, description, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [title, description || null, userId]
    );
    const questionnaire = qResult.rows[0];

    // 创建维度
    for (const dim of dimensions) {
      const dResult = await query(
        `INSERT INTO dimensions (questionnaire_id, name, sort_order)
         VALUES ($1, $2, $3) RETURNING id`,
        [questionnaire.id, dim.name, dim.sort_order]
      );
      const dimensionId = dResult.rows[0].id as string;

      // 创建指标
      for (const ind of dim.indicators) {
        await query(
          `INSERT INTO indicators (dimension_id, name, weight, sort_order, level_desc)
           VALUES ($1, $2, $3, $4, $5)`,
          [dimensionId, ind.name, ind.weight, ind.sort_order, JSON.stringify(ind.level_desc || {})]
        );
      }
    }

    // 返回完整问卷
    const full = await loadQuestionnaire(questionnaire.id as string);
    res.status(201).json(full);
  } catch (err) {
    console.error("创建问卷失败:", err);
    res.status(500).json({ error: "创建问卷失败" });
  }
});

// GET /api/questionnaires/:id
router.get("/:id", async (req, res) => {
  try {
    const q = await loadQuestionnaire(req.params.id);
    if (!q) {
      res.status(404).json({ error: "问卷不存在" });
      return;
    }
    res.json(q);
  } catch (err) {
    console.error("获取问卷失败:", err);
    res.status(500).json({ error: "获取问卷失败" });
  }
});

// PUT /api/questionnaires/:id/publish
router.put("/:id/publish", async (req, res) => {
  try {
    const result = await query(
      `UPDATE questionnaires SET status = 'published', published_at = now()
       WHERE id = $1 AND status = 'draft'
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: "问卷不存在或已发布" });
      return;
    }

    const q = await loadQuestionnaire(req.params.id);
    res.json(q);
  } catch (err) {
    console.error("发布问卷失败:", err);
    res.status(500).json({ error: "发布问卷失败" });
  }
});

// PUT /api/questionnaires/:id/archive
router.put("/:id/archive", async (req, res) => {
  try {
    const result = await query(
      `UPDATE questionnaires SET status = 'archived'
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "问卷不存在" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("归档问卷失败:", err);
    res.status(500).json({ error: "归档问卷失败" });
  }
});

async function loadQuestionnaire(id: string): Promise<QueryRow | null> {
  const qResult = await query("SELECT * FROM questionnaires WHERE id = $1", [id]);
  if (qResult.rows.length === 0) return null;

  const questionnaire = qResult.rows[0];

  const dResult = await query(
    "SELECT * FROM dimensions WHERE questionnaire_id = $1 ORDER BY sort_order",
    [id]
  );

  const dimensions = [];
  for (const dim of dResult.rows) {
    const iResult = await query(
      "SELECT * FROM indicators WHERE dimension_id = $1 ORDER BY sort_order",
      [dim.id]
    );
    dimensions.push({
      ...dim,
      indicators: iResult.rows.map((i) => ({
        ...i,
        weight: parseFloat(i.weight as string),
      })),
    });
  }

  return { ...questionnaire, dimensions };
}

export default router;
