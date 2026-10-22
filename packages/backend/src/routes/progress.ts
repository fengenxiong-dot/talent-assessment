import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/questionnaires/:id/progress
router.get("/:id/progress", async (req, res) => {
  try {
    const questionnaireId = req.params.id;

    // 整体统计
    const countResult = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted
       FROM evaluation_relations
       WHERE questionnaire_id = $1`,
      [questionnaireId]
    );

    const total = countResult.rows[0].total as number;
    const submitted = countResult.rows[0].submitted as number;

    // 详细列表
    const detailResult = await query(
      `SELECT
         eu.name AS evaluator_name,
         tu.name AS target_name,
         er.status,
         er.submitted_at
       FROM evaluation_relations er
       JOIN users eu ON er.evaluator_id = eu.id
       JOIN users tu ON er.target_id = tu.id
       WHERE er.questionnaire_id = $1
       ORDER BY er.status, eu.name, tu.name`,
      [questionnaireId]
    );

    res.json({
      total,
      submitted,
      percentage: total > 0 ? Math.round((submitted / total) * 100) : 0,
      details: detailResult.rows,
    });
  } catch (err) {
    console.error("获取进度失败:", err);
    res.status(500).json({ error: "获取进度失败" });
  }
});

export default router;
