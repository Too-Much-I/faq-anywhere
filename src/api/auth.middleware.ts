import { createMiddleware } from "hono/factory";
import jwt from "jsonwebtoken";

export const requireAuth = createMiddleware(async (c, next) => {
  const authorization = c.req.header("Authorization");
  const token = authorization?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
