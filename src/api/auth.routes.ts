import { Hono } from "hono";
import jwt from "jsonwebtoken";

const auth = new Hono();

auth.post("/login", async (c) => {
  const { password } = await c.req.json<{ password: string }>();

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return c.json({ error: "Invalid password" }, 401);
  }

  const token = jwt.sign({}, process.env.JWT_SECRET!, { expiresIn: "7d" });
  return c.json({ token });
});

export { auth as authRoutes };
