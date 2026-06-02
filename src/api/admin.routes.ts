import { Hono } from "hono";
import { requireAuth } from "./auth.middleware.js";
import {
  createFaq,
  deleteFaq,
  listFaqs,
  updateFaq,
} from "../core/faq.service.js";

const admin = new Hono();

admin.use("/*", requireAuth);

admin.get("/faqs", async (c) => {
  const category = c.req.query("category");
  const faqs = await listFaqs(category);
  return c.json(faqs);
});

admin.post("/faqs", async (c) => {
  const body = await c.req.json<{
    question: string;
    answer: string;
    category?: string;
  }>();
  const faq = await createFaq(body);
  return c.json(faq, 201);
});

admin.patch("/faqs/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    question?: string;
    answer?: string;
    category?: string;
    isActive?: boolean;
  }>();
  const faq = await updateFaq(id, body);
  return c.json(faq);
});

admin.delete("/faqs/:id", async (c) => {
  const id = c.req.param("id");
  await deleteFaq(id);
  return c.body(null, 204);
});

export { admin as adminRoutes };
