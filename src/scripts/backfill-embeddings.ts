import "dotenv/config";
import prisma from "../lib/prisma.js";
import { getEmbedding } from "../core/embedding.service.js";

async function backfillEmbeddings() {
  if (!process.env.OPENAI_API_KEY) {
    console.log("[backfill] OPENAI_API_KEY 없음, 건너뜀");
    return;
  }

  const faqs = await prisma.$queryRaw<{ id: string; question: string }[]>`
    SELECT id, question FROM faqs WHERE embedding IS NULL AND is_active = true
  `;

  if (faqs.length === 0) {
    console.log("[backfill] 재생성할 FAQ 없음");
    return;
  }

  console.log(`[backfill] ${faqs.length}개 FAQ 임베딩 생성 시작`);

  for (const faq of faqs) {
    const embedding = await getEmbedding(faq.question);
    const vector = `[${embedding.join(",")}]`;
    await prisma.$executeRaw`
      UPDATE faqs SET embedding = ${vector}::vector WHERE id = ${faq.id}::uuid
    `;
    console.log(`[backfill] ✓ ${faq.id}`);
  }

  console.log(`[backfill] 완료 (${faqs.length}개)`);
}

backfillEmbeddings()
  .then(() => process.exit(0))
  .catch((err) => {
    // 백필 실패해도 서버 시작은 막지 않음
    console.error("[backfill] 오류:", err);
    process.exit(0);
  });
