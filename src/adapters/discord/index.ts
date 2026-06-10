import { Client, GatewayIntentBits, Message } from "discord.js";
import {
  searchFaq,
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  findFaqByQuestion,
  findFaqById,
} from "../../core/faq.service.js";

type SendFn = (msg: string) => Promise<unknown>;

const pendingRegistrations = new Map<string, string>();

export async function startDiscordAdapter() {
  const { DISCORD_BOT_TOKEN } = process.env;

  if (!DISCORD_BOT_TOKEN) {
    console.log("[Discord] 환경변수 미설정, 어댑터 비활성화");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;
    if (!message.channel.isSendable()) return;

    const text = message.content.trim();
    if (!text) return;

    const userId = message.author.id;
    const channel = message.channel;
    const send: SendFn = (msg) => channel.send(msg);

    if (pendingRegistrations.has(userId)) {
      const key = pendingRegistrations.get(userId)!;
      pendingRegistrations.delete(userId);
      await handleRegisterAnswer(key, text, send);
      return;
    }

    const HELP_KEYWORDS = new Set(["help", "h", "도움말", "사용법"]);
    const SEARCH_PREFIXES = ["!질문", "!알려줘", "!궁금해", "!뭐야"];

    if (HELP_KEYWORDS.has(text.toLowerCase())) {
      await handleHelp(send);
    } else if (text.startsWith("!등록")) {
      const key = text.slice(3).trim();
      await handleRegister(key, userId, send);
    } else if (text.startsWith("!답변")) {
      const key = text.slice(3).trim();
      await handleAnswer(key, send);
    } else if (text === "!목록") {
      await handleList(send);
    } else if (text.startsWith("!삭제")) {
      const key = text.slice(3).trim();
      await handleDelete(key, send);
    } else if (SEARCH_PREFIXES.some((p) => text.startsWith(p))) {
      const prefix = SEARCH_PREFIXES.find((p) => text.startsWith(p))!;
      const query = text.slice(prefix.length).trim();
      await handleSearch(query, send);
    } else {
      await handleDefaultSearch(text, send);
    }
  });

  await client.login(DISCORD_BOT_TOKEN);
  console.log("[Discord] 어댑터 시작됨");
}

async function handleRegister(key: string, userId: string, send: SendFn) {
  if (!key) {
    await send("사용법: `!등록 [키]`\n예시: `!등록 제출마감`");
    return;
  }
  pendingRegistrations.set(userId, key);
  await send(`"${key}"에 등록할 답변 내용을 입력하세요.`);
}

async function handleRegisterAnswer(key: string, answer: string, send: SendFn) {
  try {
    const existing = await findFaqByQuestion(key);
    if (existing) {
      await updateFaq(existing.id, { answer });
      await send(`"${key}" FAQ가 수정되었습니다.`);
    } else {
      await createFaq({ question: key, answer });
      await send(`"${key}" FAQ가 등록되었습니다.`);
    }
  } catch (err) {
    console.error("[Discord] 등록 error:", err);
    await send("FAQ 등록 중 오류가 발생했습니다.");
  }
}

async function handleAnswer(key: string, send: SendFn) {
  if (!key) {
    await send("사용법: `!답변 [키]`\n예시: `!답변 제출마감`");
    return;
  }
  try {
    const faq = await findFaqByQuestion(key);
    if (!faq) {
      await send(`"${key}"에 해당하는 FAQ가 없습니다.`);
    } else {
      await send(`**Q. ${faq.question}**\n\n${faq.answer}`);
    }
  } catch (err) {
    console.error("[Discord] 답변 error:", err);
    await send("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleList(send: SendFn) {
  try {
    const faqs = await listFaqs();
    if (faqs.length === 0) {
      await send("등록된 FAQ가 없습니다.");
      return;
    }
    const lines = faqs
      .map((f, i) => `**${i + 1}. ${f.question}**\n${f.answer}`)
      .join("\n\n");
    await send(`등록된 FAQ 목록 (${faqs.length}개)\n\n${lines}`);
  } catch (err) {
    console.error("[Discord] 목록 error:", err);
    await send("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleDelete(key: string, send: SendFn) {
  if (!key) {
    await send("사용법: `!삭제 [키]` 또는 `!삭제 [id]`");
    return;
  }
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    const faq = isUuid ? await findFaqById(key) : await findFaqByQuestion(key);

    if (!faq) {
      await send(`"${key}"에 해당하는 FAQ가 없습니다.`);
      return;
    }
    await deleteFaq(faq.id);
    await send(`"${faq.question}" FAQ가 삭제되었습니다.`);
  } catch (err) {
    console.error("[Discord] 삭제 error:", err);
    await send("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleSearch(query: string, send: SendFn) {
  if (!query) {
    await send("사용법: `!질문 [질문내용]`\n예시: `!질문 제출 마감은 언제인가요?`");
    return;
  }
  try {
    const results = await searchFaq(query);
    if (results.length === 0) {
      await send("유사한 FAQ를 찾지 못했습니다.");
      return;
    }
    const lines = results
      .map((r) => {
        const sim = "similarity" in r ? ` [유사도 ${Number((r as { similarity: number }).similarity).toFixed(2)}]` : "";
        return `${sim}\nQ. ${r.question}\nA. ${r.answer}`;
      })
      .join("\n\n");
    await send(`입력한 질문과 유사한 FAQ를 찾았습니다.\n\n${lines}`);
  } catch (err) {
    console.error("[Discord] 질문 error:", err);
    await send("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleHelp(send: SendFn) {
  await send(
    `**FAQ 봇 사용법**\n\n` +
    `**등록/수정**\n` +
    "`!등록 [키]` → 답변 입력 후 FAQ 등록 (이미 있으면 덮어씀)\n\n" +
    `**조회**\n` +
    "`!답변 [키]` → 특정 키의 답변 확인\n" +
    "`!목록` → 전체 FAQ 목록\n\n" +
    `**검색**\n` +
    "`!질문 [내용]` / `!알려줘 [내용]` / `!궁금해 [내용]` / `!뭐야 [내용]` → 유사 FAQ 검색\n" +
    "또는 그냥 질문을 입력하면 자동으로 검색해드려요.\n\n" +
    `**삭제**\n` +
    "`!삭제 [키 또는 id]` → FAQ 삭제"
  );
}

async function handleDefaultSearch(text: string, send: SendFn) {
  try {
    const results = await searchFaq(text);
    if (results.length === 0) {
      await send("관련 FAQ를 찾지 못했습니다. 운영진에게 문의해 주세요.");
      return;
    }
    const top = results[0];
    await send(`**Q: ${top.question}**\n\n${top.answer}`);
  } catch (err) {
    console.error("[Discord] searchFaq error:", err);
    await send("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
