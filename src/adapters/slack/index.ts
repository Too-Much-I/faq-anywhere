import bolt from "@slack/bolt";
const { App } = bolt;
import {
  searchFaq,
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  findFaqByQuestion,
  findFaqById,
} from "../../core/faq.service.js";

type SayFn = (msg: string) => Promise<unknown>;

// /등록 두 단계: userId → 등록 중인 키
const pendingRegistrations = new Map<string, string>();

export async function startSlackAdapter() {
  const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN } = process.env;

  if (!SLACK_BOT_TOKEN || !SLACK_SIGNING_SECRET || !SLACK_APP_TOKEN) {
    console.log("[Slack] 환경변수 미설정, 어댑터 비활성화");
    return;
  }

  const app = new App({
    token: SLACK_BOT_TOKEN,
    signingSecret: SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: SLACK_APP_TOKEN,
  });

  app.message(async ({ message, say }) => {
    if (message.subtype) return;
    const text = "text" in message ? (message.text ?? "").trim() : "";
    if (!text) return;
    const userId = "user" in message ? (message.user as string) : "";
    if (!userId) return;

    // /등록 2단계: 답변 내용 입력 대기 중
    if (pendingRegistrations.has(userId)) {
      const key = pendingRegistrations.get(userId)!;
      pendingRegistrations.delete(userId);
      await handleRegisterAnswer(key, text, say);
      return;
    }

    const HELP_KEYWORDS = new Set(["help", "h", "도움말", "사용법"]);
    const SEARCH_PREFIXES = ["!질문", "!알려줘", "!궁금해", "!뭐야"];

    if (HELP_KEYWORDS.has(text.toLowerCase())) {
      await handleHelp(say);
    } else if (text.startsWith("!등록")) {
      const key = text.slice(3).trim();
      await handleRegister(key, userId, say);
    } else if (text.startsWith("!답변")) {
      const key = text.slice(3).trim();
      await handleAnswer(key, say);
    } else if (text === "!목록") {
      await handleList(say);
    } else if (text.startsWith("!삭제")) {
      const key = text.slice(3).trim();
      await handleDelete(key, say);
    } else if (SEARCH_PREFIXES.some((p) => text.startsWith(p))) {
      const prefix = SEARCH_PREFIXES.find((p) => text.startsWith(p))!;
      const query = text.slice(prefix.length).trim();
      await handleSearch(query, say);
    } else {
      await handleDefaultSearch(text, say);
    }
  });

  await app.start();
  console.log("[Slack] 어댑터 시작됨 (Socket Mode)");
}

async function handleRegister(key: string, userId: string, say: SayFn) {
  if (!key) {
    await say("사용법: `!등록 [키]`\n예시: `!등록 제출마감`");
    return;
  }
  pendingRegistrations.set(userId, key);
  await say(`"${key}"에 등록할 답변 내용을 입력하세요.`);
}

async function handleRegisterAnswer(key: string, answer: string, say: SayFn) {
  try {
    const existing = await findFaqByQuestion(key);
    if (existing) {
      await updateFaq(existing.id, { answer });
      await say(`"${key}" FAQ가 수정되었습니다.`);
    } else {
      await createFaq({ question: key, answer });
      await say(`"${key}" FAQ가 등록되었습니다.`);
    }
  } catch (err) {
    console.error("[Slack] 등록 error:", err);
    await say("FAQ 등록 중 오류가 발생했습니다.");
  }
}

async function handleAnswer(key: string, say: SayFn) {
  if (!key) {
    await say("사용법: `!답변 [키]`\n예시: `!답변 제출마감`");
    return;
  }
  try {
    const faq = await findFaqByQuestion(key);
    if (!faq) {
      await say(`"${key}"에 해당하는 FAQ가 없습니다.`);
    } else {
      await say(`*Q. ${faq.question}*\n\n${faq.answer}`);
    }
  } catch (err) {
    console.error("[Slack] 답변 error:", err);
    await say("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleList(say: SayFn) {
  try {
    const faqs = await listFaqs();
    if (faqs.length === 0) {
      await say("등록된 FAQ가 없습니다.");
      return;
    }
    const lines = faqs
      .map((f, i) => `*${i + 1}. ${f.question}*\n${f.answer}`)
      .join("\n\n");
    await say(`등록된 FAQ 목록 (${faqs.length}개)\n\n${lines}`);
  } catch (err) {
    console.error("[Slack] 목록 error:", err);
    await say("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleDelete(key: string, say: SayFn) {
  if (!key) {
    await say("사용법: `!삭제 [키]` 또는 `!삭제 [id]`");
    return;
  }
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    const faq = isUuid ? await findFaqById(key) : await findFaqByQuestion(key);

    if (!faq) {
      await say(`"${key}"에 해당하는 FAQ가 없습니다.`);
      return;
    }
    await deleteFaq(faq.id);
    await say(`"${faq.question}" FAQ가 삭제되었습니다.`);
  } catch (err) {
    console.error("[Slack] 삭제 error:", err);
    await say("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleSearch(query: string, say: SayFn) {
  if (!query) {
    await say("사용법: `!질문 [질문내용]`\n예시: `!질문 제출 마감은 언제인가요?`");
    return;
  }
  try {
    const results = await searchFaq(query);
    if (results.length === 0) {
      await say("유사한 FAQ를 찾지 못했습니다.");
      return;
    }
    const lines = results
      .map((r) => {
        const sim = "similarity" in r ? ` [유사도 ${Number((r as { similarity: number }).similarity).toFixed(2)}]` : "";
        return `${sim}\nQ. ${r.question}\nA. ${r.answer}`;
      })
      .join("\n\n");
    await say(`입력한 질문과 유사한 FAQ를 찾았습니다.\n\n${lines}`);
  } catch (err) {
    console.error("[Slack] 질문 error:", err);
    await say("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleHelp(say: SayFn) {
  await say(
    `*FAQ 봇 사용법*\n\n` +
    `*등록/수정*\n` +
    `\`!등록 [키]\` → 답변 입력 후 FAQ 등록 (이미 있으면 덮어씀)\n\n` +
    `*조회*\n` +
    `\`!답변 [키]\` → 특정 키의 답변 확인\n` +
    `\`!목록\` → 전체 FAQ 목록\n\n` +
    `*검색*\n` +
    `\`!질문 [내용]\` / \`!알려줘 [내용]\` / \`!궁금해 [내용]\` / \`!뭐야 [내용]\` → 유사 FAQ 검색\n` +
    `또는 그냥 질문을 입력하면 자동으로 검색해드려요.\n\n` +
    `*삭제*\n` +
    `\`!삭제 [키 또는 id]\` → FAQ 삭제`
  );
}

async function handleDefaultSearch(text: string, say: SayFn) {
  try {
    const results = await searchFaq(text);
    if (results.length === 0) {
      await say("관련 FAQ를 찾지 못했습니다. 운영진에게 문의해 주세요.");
      return;
    }
    const top = results[0];
    await say(`*Q: ${top.question}*\n\n${top.answer}`);
  } catch (err) {
    console.error("[Slack] searchFaq error:", err);
    await say("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
