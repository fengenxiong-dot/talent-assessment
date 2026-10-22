import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { query } from "../db.js";
import { sendWorkNotification } from "../services/dingtalk.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

async function findUserByJobNumber(
  jobNumber: string,
  expectedName: string,
): Promise<{ id: string; name: string; dingtalk_id: string } | null> {
  const result = await query(
    `SELECT id, name, dingtalk_id FROM users
     WHERE job_number = $1 AND active = TRUE AND dingtalk_id NOT LIKE 'placeholder_%'`,
    [jobNumber.trim()],
  );
  if (result.rows.length !== 1) return null;
  if (expectedName.trim() && result.rows[0].name !== expectedName.trim()) return null;
  return result.rows[0] as { id: string; name: string; dingtalk_id: string };
}

// POST /api/questionnaires/:id/relations/upload
router.post("/:id/relations/upload", upload.single("file"), async (req, res) => {
  try {
    const questionnaireId = req.params.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "未上传文件" });
      return;
    }

    // 检查问卷状态
    const q = await query("SELECT status FROM questionnaires WHERE id = $1", [questionnaireId]);
    if (q.rows.length === 0) {
      res.status(404).json({ error: "问卷不存在" });
      return;
    }
    if (q.rows[0].status === "archived") {
      res.status(400).json({ error: "问卷已归档，不可修改评价关系" });
      return;
    }
    if (q.rows[0].status === "draft") {
      res.status(400).json({ error: "请先发布问卷再导入评价关系" });
      return;
    }

    // 解析 Excel
    const workbook = XLSX.read(file.buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    const errors: string[] = [];
    const created: string[] = [];
    const skipped: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue; // 跳过空行

      const targetJobNumber = String(row[0] || "").trim();
      const targetName = String(row[1] || "").trim();
      const evaluator1JobNumber = String(row[2] || "").trim();
      const evaluator1Name = String(row[3] || "").trim();
      const evaluator2JobNumber = String(row[4] || "").trim();
      const evaluator2Name = String(row[5] || "").trim();

      if (!targetJobNumber || !targetName || !evaluator1JobNumber || !evaluator1Name) {
        errors.push(`第 ${i + 1} 行: 被评价人或评价人1的工号/姓名为空`);
        continue;
      }

      const target = await findUserByJobNumber(targetJobNumber, targetName);
      const eval1 = await findUserByJobNumber(evaluator1JobNumber, evaluator1Name);

      if (!target || !eval1) {
        errors.push(
          `第 ${i + 1} 行: 工号与姓名无法匹配通讯录（被评价人 ${targetJobNumber}/${targetName}，评价人1 ${evaluator1JobNumber}/${evaluator1Name}）`,
        );
        continue;
      }

      // 检查是否已存在相同评价关系（评价人1）
      const existing = await query(
        `SELECT id FROM evaluation_relations
         WHERE questionnaire_id = $1 AND target_id = $2 AND evaluator_id = $3`,
        [questionnaireId, target.id, eval1.id]
      );

      if (existing.rows.length > 0) {
        skipped.push(`${targetName} — ${evaluator1Name}`);
        continue;
      }

      // 处理评价人
      if (evaluator2JobNumber || evaluator2Name) {
        if (!evaluator2JobNumber || !evaluator2Name) {
          errors.push(`第 ${i + 1} 行: 评价人2必须同时填写工号和姓名`);
          continue;
        }
        // 两人评价
        const eval2 = await findUserByJobNumber(evaluator2JobNumber, evaluator2Name);
        if (!eval2) {
          errors.push(`第 ${i + 1} 行: 评价人2工号与姓名无法匹配通讯录`);
          continue;
        }

        await query(
          `INSERT INTO evaluation_relations (questionnaire_id, target_id, evaluator_id, evaluator_weight)
           VALUES ($1, $2, $3, $4)`,
          [questionnaireId, target.id, eval1.id, 60]
        );
        await query(
          `INSERT INTO evaluation_relations (questionnaire_id, target_id, evaluator_id, evaluator_weight)
           VALUES ($1, $2, $3, $4)`,
          [questionnaireId, target.id, eval2.id, 40]
        );
        created.push(`${targetName} — ${evaluator1Name}(60%) + ${evaluator2Name}(40%)`);
      } else {
        // 单人评价
        await query(
          `INSERT INTO evaluation_relations (questionnaire_id, target_id, evaluator_id, evaluator_weight)
           VALUES ($1, $2, $3, 100)`,
          [questionnaireId, target.id, eval1.id]
        );
        created.push(`${targetName} — ${evaluator1Name}(100%)`);
      }
    }

    res.json({
      total: rows.length - 1,
      created: created.length,
      skipped: skipped.length,
      errors,
      items: created,
      errorItems: errors,
    });
  } catch (err) {
    console.error("导入评价关系失败:", err);
    res.status(500).json({ error: "导入失败" });
  }
});

// GET /api/questionnaires/:id/relations
router.get("/:id/relations", async (req, res) => {
  try {
    const result = await query(
      `SELECT er.*,
              tu.name AS target_name,
              eu.name AS evaluator_name
       FROM evaluation_relations er
       JOIN users tu ON er.target_id = tu.id
       JOIN users eu ON er.evaluator_id = eu.id
       WHERE er.questionnaire_id = $1
       ORDER BY tu.name, er.evaluator_weight DESC`,
      [req.params.id]
    );

    res.json(
      result.rows.map((r) => ({
        ...r,
        evaluator_weight: parseFloat(r.evaluator_weight as string),
      }))
    );
  } catch (err) {
    console.error("获取评价关系失败:", err);
    res.status(500).json({ error: "获取评价关系失败" });
  }
});

// POST /api/questionnaires/:id/relations/push
router.post("/:id/relations/push", async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT eu.dingtalk_id, eu.name
       FROM evaluation_relations er
       JOIN users eu ON eu.id = er.evaluator_id
       WHERE er.questionnaire_id = $1 AND er.status = 'pending'`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.json({ success: true, count: 0, message: "无待推送的评价人" });
      return;
    }

    const invalid = result.rows.filter(
      (row) => !row.dingtalk_id || String(row.dingtalk_id).startsWith("placeholder_"),
    );
    if (invalid.length > 0) {
      res.status(400).json({
        error: `以下评价人未绑定真实钉钉账号：${invalid.map((row) => row.name).join("、")}`,
      });
      return;
    }
    const questionnaire = await query(
      "SELECT title FROM questionnaires WHERE id = $1",
      [req.params.id],
    );
    const title = String(questionnaire.rows[0]?.title || "人才盘点评价");
    const userIds = result.rows.map((row) => String(row.dingtalk_id));
    const taskIds = await sendWorkNotification(
      userIds,
      `人才盘点评价：${title}`,
      `### 您有一项人才盘点评价待完成\n\n问卷：${title}\n\n请点击下方按钮进入应用完成评价。`,
    );
    res.json({ success: true, count: userIds.length, task_ids: taskIds });
  } catch (err) {
    console.error("推送通知失败:", err);
    const detail = err instanceof Error ? err.message : "未知错误";
    res.status(500).json({ error: `推送通知失败：${detail}` });
  }
});

export default router;
