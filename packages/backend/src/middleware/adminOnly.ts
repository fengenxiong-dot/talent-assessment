import type { Request, Response, NextFunction } from "express";
import type { AuthUser } from "./auth.js";

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  const user = (req as Request & { user: AuthUser }).user;
  if (!user || !user.is_admin) {
    res.status(403).json({ error: "仅管理员可操作" });
    return;
  }
  next();
}
