import { randomUUID } from "crypto";
import prisma from "../lib/prisma.js";
import { getEmbedding } from "./embedding.service.js";

const SEARCH_LIMIT = 3;

const hasOpenAI = () => Boolean(process.env.OPENAI_API_KEY);

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  similarity: number;
};

export async function searchFaq(query: string, category?: string) {
  // OPENAI_API_KEY 미설정 시 키워드 LIKE 검색으로 fallback
  if (!hasOpenAI()) {
    const keywords = query.trim().split(/\s+/);
    return prisma.faq.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
        AND: keywords.map((kw) => ({
          OR: [
            { question: { contains: kw, mode: "insensitive" as const } },
            { answer: { contains: kw, mode: "insensitive" as const } },
          ],
        })),
      },
      take: SEARCH_LIMIT,
      select: { id: true, question: true, answer: true },
    });
  }

  const embedding = await getEmbedding(query);
  const vector = `[${embedding.join(",")}]`;

  const rows = category
    ? await prisma.$queryRaw<FaqRow[]>`
        SELECT id, question, answer,
               1 - (embedding <=> ${vector}::vector) AS similarity
        FROM faqs
        WHERE is_active = true AND category = ${category}
        ORDER BY embedding <=> ${vector}::vector
        LIMIT ${SEARCH_LIMIT}`
    : await prisma.$queryRaw<FaqRow[]>`
        SELECT id, question, answer,
               1 - (embedding <=> ${vector}::vector) AS similarity
        FROM faqs
        WHERE is_active = true
        ORDER BY embedding <=> ${vector}::vector
        LIMIT ${SEARCH_LIMIT}`;

  return rows;
}

export async function listFaqs(category?: string) {
  return prisma.faq.findMany({
    where: { isActive: true, ...(category && { category }) },
    select: { id: true, question: true, answer: true, category: true, isActive: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFaq(data: {
  question: string;
  answer: string;
  category?: string;
}) {
  const id = randomUUID();
  const now = new Date();

  if (hasOpenAI()) {
    const embedding = await getEmbedding(data.question);
    const vector = `[${embedding.join(",")}]`;
    await prisma.$executeRaw`
      INSERT INTO faqs (id, question, answer, category, embedding, is_active, created_at, updated_at)
      VALUES (${id}::uuid, ${data.question}, ${data.answer}, ${data.category ?? null}, ${vector}::vector, true, ${now}, ${now})
    `;
  } else {
    // OPENAI_API_KEY 미설정 시 임베딩 없이 저장 (키워드 검색만 가능)
    await prisma.$executeRaw`
      INSERT INTO faqs (id, question, answer, category, is_active, created_at, updated_at)
      VALUES (${id}::uuid, ${data.question}, ${data.answer}, ${data.category ?? null}, true, ${now}, ${now})
    `;
  }

  return prisma.faq.findUniqueOrThrow({
    where: { id },
    select: { id: true, question: true, answer: true, category: true, isActive: true, createdAt: true, updatedAt: true },
  });
}

export async function updateFaq(
  id: string,
  data: { question?: string; answer?: string; category?: string; isActive?: boolean }
) {
  if (data.question && hasOpenAI()) {
    const embedding = await getEmbedding(data.question);
    const vector = `[${embedding.join(",")}]`;
    await prisma.$executeRaw`
      UPDATE faqs SET embedding = ${vector}::vector WHERE id = ${id}::uuid
    `;
  }

  return prisma.faq.update({
    where: { id },
    data: {
      ...(data.question !== undefined && { question: data.question }),
      ...(data.answer !== undefined && { answer: data.answer }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: { id: true, question: true, answer: true, category: true, isActive: true, createdAt: true, updatedAt: true },
  });
}

export async function deleteFaq(id: string) {
  return prisma.faq.delete({ where: { id } });
}

export async function findFaqByQuestion(question: string) {
  return prisma.faq.findFirst({
    where: { question: { equals: question, mode: "insensitive" } },
    select: { id: true, question: true, answer: true, category: true },
  });
}

export async function findFaqById(id: string) {
  return prisma.faq.findUnique({
    where: { id },
    select: { id: true, question: true, answer: true, category: true },
  });
}
