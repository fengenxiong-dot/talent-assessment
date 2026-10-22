import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/questionnaires/:id/aggregation
router.get("/:id/aggregation", async (req, res) => {
  try {
    const questionnaireId = req.params.id;

    // 获取所有大维度名称
    const dimResult = await query(
      "SELECT id, name FROM dimensions WHERE questionnaire_id = $1 ORDER BY sort_order",
      [questionnaireId]
    );
    const dimensionNames = dimResult.rows.map((d) => d.name as string);

    if (dimensionNames.length === 0) {
      res.json({ people: [], dimension_names: [] });
      return;
    }

    // 加权汇总 SQL
    const aggResult = await query(
      `SELECT
         er.target_id,
         tu.name,
         d.id AS dimension_id,
         d.name AS dimension_name,
         ROUND(CAST(SUM(s.score * i.weight / 100.0 * er.evaluator_weight / 100.0) AS numeric), 2) AS weighted_score
       FROM evaluation_relations er
       JOIN scores s ON s.relation_id = er.id
       JOIN indicators i ON i.id = s.indicator_id
       JOIN dimensions d ON d.id = i.dimension_id
       JOIN users tu ON tu.id = er.target_id
       WHERE er.questionnaire_id = $1
       GROUP BY er.target_id, tu.name, d.id, d.name
       ORDER BY tu.name, d.sort_order`,
      [questionnaireId]
    );

    // 组装每人每维度分数
    const peopleMap = new Map<
      string,
      {
        user_id: string;
        name: string;
        dimension_scores: Record<string, number>;
        groups: Record<string, string>;
      }
    >();

    for (const row of aggResult.rows) {
      const targetId = row.target_id as string;
      const dimName = row.dimension_name as string;
      const score = parseFloat(row.weighted_score as string);

      if (!peopleMap.has(targetId)) {
        peopleMap.set(targetId, {
          user_id: targetId,
          name: row.name as string,
          dimension_scores: {},
          groups: {},
        });
      }
      peopleMap.get(targetId)!.dimension_scores[dimName] = score;
    }

    res.json({
      people: [...peopleMap.values()],
      dimension_names: dimensionNames,
    });
  } catch (err) {
    console.error("汇总数据失败:", err);
    res.status(500).json({ error: "汇总数据失败" });
  }
});

// GET /api/questionnaires/:id/grid?x_dim=xxx&y_dim=yyy
router.get("/:id/grid", async (req, res) => {
  try {
    const questionnaireId = req.params.id;
    const xDim = req.query.x_dim as string;
    const yDim = req.query.y_dim as string;

    if (!xDim || !yDim) {
      res.status(400).json({ error: "需要指定 x_dim 和 y_dim" });
      return;
    }

    // 加权汇总
    const aggResult = await query(
      `SELECT
         er.target_id,
         tu.name,
         d.name AS dimension_name,
         ROUND(CAST(SUM(s.score * i.weight / 100.0 * er.evaluator_weight / 100.0) AS numeric), 2) AS weighted_score
       FROM evaluation_relations er
       JOIN scores s ON s.relation_id = er.id
       JOIN indicators i ON i.id = s.indicator_id
       JOIN dimensions d ON d.id = i.dimension_id
       JOIN users tu ON tu.id = er.target_id
       WHERE er.questionnaire_id = $1
       GROUP BY er.target_id, tu.name, d.name
       ORDER BY tu.name`,
      [questionnaireId]
    );

    // 构建每人每维度的分数映射
    const peopleMap = new Map<
      string,
      {
        user_id: string;
        name: string;
        groups: Record<string, string>;
        scores: Record<string, number>;
        dimension_scores: Record<string, number>;
      }
    >();

    for (const row of aggResult.rows) {
      const targetId = row.target_id as string;
      const dimName = row.dimension_name as string;
      const score = parseFloat(row.weighted_score as string);

      if (!peopleMap.has(targetId)) {
        peopleMap.set(targetId, {
          user_id: targetId,
          name: row.name as string,
          groups: {},
          scores: {},
          dimension_scores: {},
        });
      }
      peopleMap.get(targetId)!.dimension_scores[dimName] = score;
      peopleMap.get(targetId)!.scores[dimName] = score;
    }

    const people = [...peopleMap.values()];

    // 分值映射函数
    function getScoreLevel(score: number): "低" | "中" | "高" {
      if (score <= 2.5) return "低";
      if (score <= 3.5) return "中";
      return "高";
    }

    // 默认标签
    const defaultLabels = [
      ["中坚力量", "潜力之星", "明星人才"],
      ["稳定贡献", "中坚力量", "潜力之星"],
      ["待提升", "稳定贡献", "专业人才"],
    ];

    const xLevels: Array<"低" | "中" | "高"> = ["低", "中", "高"];
    const yLevels: Array<"高" | "中" | "低"> = ["高", "中", "低"];

    const cells = [];
    for (let yi = 0; yi < 3; yi++) {
      for (let xi = 0; xi < 3; xi++) {
        const xLevel = xLevels[xi];
        const yLevel = yLevels[yi];

        const cellPeople = people.filter((p) => {
          const xScore = p.dimension_scores[xDim] ?? 0;
          const yScore = p.dimension_scores[yDim] ?? 0;
          return getScoreLevel(xScore) === xLevel && getScoreLevel(yScore) === yLevel;
        });

        cells.push({
          xLevel,
          yLevel,
          label: defaultLabels[yi][xi],
          people: cellPeople,
        });
      }
    }

    res.json({
      x_dim: xDim,
      y_dim: yDim,
      cells,
    });
  } catch (err) {
    console.error("生成九宫格数据失败:", err);
    res.status(500).json({ error: "生成九宫格数据失败" });
  }
});

export default router;
