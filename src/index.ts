import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { adminRoutes } from "./api/admin.routes.js";
import { authRoutes } from "./api/auth.routes.js";
import { startSlackAdapter } from "./adapters/slack/index.js";
import { startDiscordAdapter } from "./adapters/discord/index.js";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/auth", authRoutes);
app.route("/api/admin", adminRoutes);

// 어드민 SPA 정적 파일 (production 빌드 시)
app.use("/*", serveStatic({ root: "./admin/dist" }));

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`FAQ Anywhere 서버 실행 중: http://localhost:${port}`);
});

// 플랫폼 어댑터 시작
startSlackAdapter().catch(console.error);
startDiscordAdapter().catch(console.error);
