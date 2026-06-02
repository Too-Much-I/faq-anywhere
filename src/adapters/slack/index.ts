import { App } from "@slack/bolt";
import { searchFaq } from "../../core/faq.service.js";

export async function startSlackAdapter() {
  const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN } = process.env;

  if (!SLACK_BOT_TOKEN || !SLACK_SIGNING_SECRET || !SLACK_APP_TOKEN) {
    console.log("[Slack] 환경변수 미설정, 어댑터 비활성화");
    return;
  }

  const app = new App({
    token: SLACK_BOT_TOKEN,
    signingSecret: SLACK_SIGNING_SECRET,
    socketMode: true,    // Socket Mode: 아웃바운드 연결, 인바운드 웹훅 불필요
    appToken: SLACK_APP_TOKEN,
  });

  app.message(async ({ message, say }) => {
    if (message.subtype) return;
    const text = "text" in message ? (message.text ?? "") : "";
    if (!text.trim()) return;

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
  });

  await app.start();
  console.log("[Slack] 어댑터 시작됨 (Socket Mode)");
}
