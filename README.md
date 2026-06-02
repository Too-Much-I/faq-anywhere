# 📋 FAQ Anywhere

자주 묻는 질문(FAQ)을 등록해두면, Slack이나 Discord에서 바로 검색해서 답변받을 수 있는 봇 서비스입니다.

OpenAI 임베딩 기반의 **의미 검색**을 지원하고, OpenAI API Key가 없어도 키워드 검색으로 fallback되어 바로 사용 가능합니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 📝 FAQ 등록/수정/삭제 | 어드민 웹 페이지 또는 Slack 봇 명령어로 관리 |
| 🔍 의미 기반 검색 | OpenAI 임베딩으로 유사한 FAQ 자동 매칭 |
| 💬 Slack 봇 | 채널에서 질문하면 바로 답변 |
| 🎮 Discord 봇 | (개발 중) |
| 🗂️ 카테고리 | FAQ를 카테고리별로 분류 가능 |

---

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 저장소 클론
git clone https://github.com/Too-Much-I/faq-anywhere.git
cd faq-anywhere

# 환경변수 파일 생성
cp .env.example .env
```

`.env` 파일을 열어 아래 값들을 설정하세요:

```env
# 필수
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/faqanywhere
ADMIN_PASSWORD=원하는비밀번호

# 어드민 페이지 로그인 토큰 서명용 (로컬에서는 아무 값이나 가능, 배포 시 필수)
JWT_SECRET=랜덤한64자리문자열

# 선택 (없으면 키워드 검색으로 동작)
OPENAI_API_KEY=sk-...

# Slack 봇 사용 시
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...
```

### 2. 의존성 설치 및 DB 마이그레이션

```bash
npm install
npm run db:migrate
```

### 3. 서버 실행

```bash
npm run dev
```

서버가 실행되면 `http://localhost:3000` 에서 어드민 페이지에 접속할 수 있습니다.

---

## 🖥️ 어드민 페이지

> FAQ를 등록하고 관리하는 웹 페이지입니다. **운영자만 사용**하는 페이지로, 배포 없이 로컬에서 사용합니다.

1. `http://localhost:3000` 접속
2. `.env`에 설정한 `ADMIN_PASSWORD`로 로그인
3. FAQ 추가 / 수정 / 삭제

---

## 💬 Slack 봇 사용법

Slack 채널에 봇을 초대한 후, 아래 명령어를 사용하세요.

### 🔍 검색

| 입력 | 설명 |
|------|------|
| `질문 내용` | 그냥 입력하면 자동으로 유사 FAQ 검색 |
| `!질문 [내용]` | 명시적으로 유사 FAQ 검색 |
| `!알려줘 [내용]` | 위와 동일 |
| `!궁금해 [내용]` | 위와 동일 |
| `!뭐야 [내용]` | 위와 동일 |

**예시:**
```
제출 마감이 언제야?
!질문 과제 제출 마감일 알려줘
```

### 📝 등록 / 수정

```
!등록 [키]
```
입력 후 봇이 답변 내용을 물어보면 답변을 입력합니다. 같은 키가 이미 있으면 덮어씁니다.

**예시:**
```
사용자: !등록 제출마감
봇: "제출마감"에 등록할 답변 내용을 입력하세요.
사용자: 매주 일요일 자정까지입니다.
봇: "제출마감" FAQ가 등록되었습니다.
```

### 📋 기타 명령어

| 명령어 | 설명 |
|--------|------|
| `!답변 [키]` | 특정 키의 FAQ 답변 확인 |
| `!목록` | 전체 FAQ 목록 보기 |
| `!삭제 [키 또는 id]` | FAQ 삭제 |
| `help` / `도움말` | 사용법 안내 |

---

## 🛠️ 기술 스택

- **백엔드:** Node.js, Hono, TypeScript
- **DB:** PostgreSQL + pgvector (임베딩 벡터 저장)
- **AI:** OpenAI Embeddings (없으면 키워드 검색 fallback)
- **어드민:** React + Vite
- **Slack 봇:** @slack/bolt (Socket Mode)

---

## ☁️ 배포 (Railway / Render)

봇이 외부에서 메시지를 받으려면 서버가 항상 켜져 있어야 합니다.

```bash
# 배포 전 빌드
npm run build

# 시작 명령
npm start
```

> 어드민 페이지는 별도로 배포하지 않아도 됩니다. 백엔드와 같은 서버에서 서빙되지만, 운영자가 로컬에서만 사용하는 용도입니다.

---

## 🗃️ 데이터베이스 유틸리티

```bash
# DB 스튜디오 (브라우저에서 DB 직접 확인)
npm run db:studio

# 임베딩이 없는 FAQ에 임베딩 일괄 생성
npm run backfill
```
