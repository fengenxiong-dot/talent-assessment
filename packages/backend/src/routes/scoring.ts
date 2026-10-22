import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";

const router = Router();

// GET /api/my/evaluations
router.get("/evaluations", async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const questionnaireId = req.query.questionnaire_id as string | undefined;

    let sql = `
      SELECT er.*, tu.name AS target_name, q.title AS questionnaire_title
      FROM evaluation_relations er
      JOIN users tu ON er.target_id = tu.id
      JOIN questionnaires q ON er.questionnaire_id = q.id
      WHERE er.evaluator_id = $1
    `;
    const params: unknown[] = [userId];

    if (questionnaireId) {
      sql += ` AND er.questionnaire_id = $2`;
      params.push(questionnaireId);
    }

    sql += ` ORDER BY er.status, tu.name`;

    const result = await query(sql, params);
    res.json(
      result.rows.map((r) => ({
        ...r,
        evaluator_weight: parseFloat(r.evaluator_weight as string),
      }))
    );
  } catch (err) {
    console.error("获取评价列表失败:", err);
    res.status(500).json({ error: "获取评价列表失败" });
  }
});

// GET /api/my/evaluations/:relationId
router.get("/evaluations/:relationId", async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const { relationId } = req.params;

    // 获取评价关系
    const relResult = await query(
      `SELECT er.*, tu.name AS target_name, q.title AS questionnaire_title
       FROM evaluation_relations er
       JOIN users tu ON er.target_id = tu.id
       JOIN questionnaires q ON er.questionnaire_id = q.id
       WHERE er.id = $1 AND er.evaluator_id = $2`,
      [relationId, userId]
    );

    if (relResult.rows.length === 0) {
      res.status(404).json({ error: "评价关系不存在" });
      return;
    }

    const relation = relResult.rows[0];

    // 获取问卷 ID
    const q = await query(
      "SELECT questionnaire_id FROM evaluation_relations WHERE id = $1",
      [relationId]
    );
    const questionnaireId = q.rows[0].questionnaire_id;

    // 获取维度 + 指标
    const dResult = await query(
      `SELECT d.id AS dim_id, d.name AS dim_name, d.sort_order AS dim_order,
              i.id AS ind_id, i.name AS ind_name,
              i.weight, i.sort_order AS ind_order, i.level_desc
       FROM dimensions d
       JOIN indicators i ON d.id = i.dimension_id
       WHERE d.questionnaire_id = $1
       ORDER BY d.sort_order, i.sort_order`,
      [questionnaireId]
    );

    // 获取已有的打分
    const scoreResult = await query(
      "SELECT indicator_id, score FROM scores WHERE relation_id = $1",
      [relationId]
    );
    const scoreMap = new Map<string, number>();
    scoreResult.rows.forEach((s) => scoreMap.set(s.indicator_id as string, parseFloat(s.score as string)));

    // 组装维度→指标结构
    const dimMap = new Map<string, { id: string; name: string; sort_order: number; indicators: unknown[] }>();
    for (const row of dResult.rows) {
      const dimId = row.dim_id as string;
      if (!dimMap.has(dimId)) {
        dimMap.set(dimId, {
          id: dimId,
          name: row.dim_name as string,
          sort_order: row.dim_order as number,
          indicators: [],
        });
      }
      dimMap.get(dimId)!.indicators.push({
        id: row.ind_id as string,
        name: row.ind_name as string,
        weight: parseFloat(row.weight as string),
        sort_order: row.ind_order as number,
        level_desc: row.level_desc,
        current_score: scoreMap.get(row.ind_id as string) ?? null,
      });
    }

    res.json({
      relation: {
        ...relation,
        evaluator_weight: parseFloat(relation.evaluator_weight as string),
      },
      dimensions: [...dimMap.values()],
    });
  } catch (err) {
    console.error("获取评分表单失败:", err);
    res.status(500).json({ error: "获取评分表单失败" });
  }
});

// PUT /api/my/evaluations/:relationId/scores
const submitSchema = z.object({
  scores: z.array(
    z.object({
      indicator_id: z.string().uuid(),
      score: z.number().min(1).max(5),
    })
  ),
});

router.put("/evaluations/:relationId/scores", async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const { relationId } = req.params;

    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "参数格式错误" });
      return;
    }

    // 验证评价关系归属
    const relResult = await query(
      "SELECT id, questionnaire_id FROM evaluation_relations WHERE id = $1 AND evaluator_id = $2",
      [relationId, userId]
    );

    if (relResult.rows.length === 0) {
      res.status(404).json({ error: "评价关系不存在" });
      return;
    }

    // 验证指标是否属于该问卷
    const questionnaireId = relResult.rows[0].questionnaire_id;
    const qResult = await query(
      `SELECT i.id AS indicator_id
       FROM indicators i
       JOIN dimensions d ON i.dimension_id = d.id
       WHERE d.questionnaire_id = $1`,
      [questionnaireId]
    );
    const validIndicatorIds = new Set(qResult.rows.map((r) => r.indicator_id as string));

    // Upsert 每条评分
    for (const { indicator_id, score } of parsed.data.scores) {
      if (!validIndicatorIds.has(indicator_id)) {
        res.status(400).json({ error: `指标 ${indicator_id} 不属于该问卷` });
        return;
      }

      await query(
        `INSERT INTO scores (relation_id, indicator_id, score)
         VALUES ($1, $2, $3)
         ON CONFLICT (relation_id, indicator_id) DO UPDATE SET score = $3`,
        [relationId, indicator_id, score]
      );
    }

    // 更新评价关系状态
    await query(
      `UPDATE evaluation_relations SET status = 'submitted', submitted_at = now()
       WHERE id = $1`,
      [relationId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("提交评分失败:", err);
    res.status(500).json({ error: "提交评分失败" });
  }
});

export default router;
