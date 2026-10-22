import "dotenv/config";
import pool from "../db.js";

async function main() {
  // 获取最新的一份已发布问卷
  const q = await pool.query(
    "SELECT id, title FROM questionnaires WHERE status = 'published' ORDER BY created_at DESC LIMIT 1"
  );
  if (!q.rows[0]) {
    console.log("没有已发布的问卷，请先发布一份问卷");
    process.exit(1);
  }
  const qid = q.rows[0].id;
  console.log("问卷:", q.rows[0].title);

  // 获取所有维度
  const dims = await pool.query(
    "SELECT id, name FROM dimensions WHERE questionnaire_id = $1 ORDER BY sort_order",
    [qid]
  );
  console.log(`\n维度: ${dims.rows.map((d) => d.name).join(", ")}`);

  // 获取各维度下的指标
  const indicatorsByDim = new Map<string, { id: string; name: string }[]>();
  for (const d of dims.rows) {
    const inds = await pool.query(
      "SELECT id, name FROM indicators WHERE dimension_id = $1 ORDER BY sort_order",
      [d.id]
    );
    indicatorsByDim.set(d.id as string, inds.rows as { id: string; name: string }[]);
  }

  // 获取评价关系
  const rels = await pool.query(
    `SELECT er.id, er.target_id, er.evaluator_id, er.evaluator_weight,
            tu.name AS target_name, eu.name AS evaluator_name
     FROM evaluation_relations er
     JOIN users tu ON er.target_id = tu.id
     JOIN users eu ON er.evaluator_id = eu.id
     WHERE er.questionnaire_id = $1`,
    [qid]
  );

  if (!rels.rows[0]) {
    console.log("还没有导入评价关系");
    process.exit(1);
  }

  console.log(`\n评价关系: ${rels.rows.length} 条`);

  // 获取所有指标（按维度排序）
  const allIndicators: { id: string; name: string; dim_name: string }[] = [];
  for (const d of dims.rows) {
    const inds = indicatorsByDim.get(d.id as string) || [];
    for (const ind of inds) {
      allIndicators.push({ id: ind.id, name: ind.name, dim_name: d.name as string });
    }
  }

  // 为每条评价关系生成随机分数
  let inserted = 0;
  for (const rel of rels.rows as {
    id: string;
    target_name: string;
    evaluator_name: string;
    evaluator_weight: number;
  }[]) {
    const existing = await pool.query("SELECT COUNT(*)::int AS c FROM scores WHERE relation_id = $1", [rel.id]);
    if (existing.rows[0].c > 0) {
      console.log(`  ${rel.evaluator_name} → ${rel.target_name}: 已有分数，跳过`);
      continue;
    }

    for (const ind of allIndicators) {
      // 随机 1-5 分，保留两位小数
      const score = parseFloat((1 + Math.random() * 4).toFixed(2));
      await pool.query(
        `INSERT INTO scores (relation_id, indicator_id, score) VALUES ($1, $2, $3)
         ON CONFLICT (relation_id, indicator_id) DO UPDATE SET score = $3`,
        [rel.id, ind.id, score]
      );
    }

    // 更新关系状态
    await pool.query(
      "UPDATE evaluation_relations SET status = 'submitted', submitted_at = now() WHERE id = $1",
      [rel.id]
    );

    console.log(`  ✅ ${rel.evaluator_name} → ${rel.target_name} (${rel.evaluator_weight}%)`);
    inserted++;
  }

  console.log(`\n完成！已为 ${inserted} 条评价关系生成随机分数`);
  await pool.end();
}

main().catch(console.error);
