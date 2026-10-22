import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware/auth.js";
import { adminOnly } from "./middleware/adminOnly.js";
import authRoutes from "./routes/auth.js";
import questionnaireRoutes from "./routes/questionnaire.js";
import relationRoutes from "./routes/relation.js";
import scoringRoutes from "./routes/scoring.js";
import aggregationRoutes from "./routes/aggregation.js";
import progressRoutes from "./routes/progress.js";
import contactsRoutes from "./routes/contacts.js";

const app = express();
const PORT = Number(
  process.env.FC_SERVER_PORT ||
    process.env.PORT ||
    (process.env.NODE_ENV === "production" ? 9000 : 3000),
);

app.use(cors());
app.use(express.json());

// Health check (无需鉴权)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// 公开路由（无需鉴权）
app.use("/api/auth", authRoutes);

// 评价人路由（需要鉴权）
app.use("/api/my", authMiddleware, scoringRoutes);

// 管理员路由（需要鉴权 + 管理员权限）
app.use("/api/questionnaires", authMiddleware, adminOnly, questionnaireRoutes);
app.use("/api/questionnaires", authMiddleware, adminOnly, relationRoutes);
app.use("/api/questionnaires", authMiddleware, adminOnly, aggregationRoutes);
app.use("/api/questionnaires", authMiddleware, adminOnly, progressRoutes);
app.use("/api/contacts", authMiddleware, adminOnly, contactsRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

export default app;
