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
| 🎮 Discord 봇 | 채널에서 질문하면 바로 답변 |
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

# Discord 봇 사용 시
DISCORD_BOT_TOKEN=...
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

## 🎮 Discord 봇 사용법

Discord 서버에 봇을 초대한 후, 아래 명령어를 사용하세요.

> `!`로 시작하는 명령어는 채널 어디서든 동작하지만, 명령어 없이 일반 문장으로 질문할 때는 **봇을 멘션(@봇이름)해야** 자동 검색이 동작합니다.

### 🔍 검색

| 입력 | 설명 |
|------|------|
| `@봇이름 질문 내용` | 봇을 멘션하면 자동으로 유사 FAQ 검색 |
| `!질문 [내용]` | 명시적으로 유사 FAQ 검색 |
| `!알려줘 [내용]` | 위와 동일 |
| `!궁금해 [내용]` | 위와 동일 |
| `!뭐야 [내용]` | 위와 동일 |

**예시:**
```
@FAQ Anywhere 제출 마감이 언제야?
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

## 🎮 Discord 봇 설정

Discord 봇을 사용하려면 Discord Developer Portal에서 애플리케이션을 만들고 토큰을 발급받아야 합니다.

### 1. 애플리케이션 생성

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속 후 로그인
2. 우측 상단 **만들기** 클릭 → 서버나 커뮤니티용 봇 생성하기 -> 이름 입력 (예: FAQ Anywhere) → **만들기**

#### 우측 상단 만들기 버튼 클릭하기
<img src="./docs/image1.png">

#### 봇 이름 입력 후 생성하기 
<img src="./docs/image2.png">

### 2. 봇(Bot) 생성 및 토큰 발급

<img src="./docs/image3.png">

1. 좌측 메뉴에서 **봇** 탭 클릭
2. **토큰 초기화** 클릭 → 표시된 토큰을 복사
3. 복사한 토큰을 `.env`의 `DISCORD_BOT_TOKEN`에 붙여넣기



### 3. Privileged Gateway Intents 활성화 (필수)

같은 **Bot** 탭 하단의 **Privileged Gateway Intents**에서 아래 항목을 켜주세요. 꺼져 있으면 봇이 메시지 내용을 읽지 못해 동작하지 않습니다.

- ✅ **MESSAGE CONTENT INTENT**

<img src="./docs/image4.png">

### 4. 서버에 봇 초대하기

1. 좌측 메뉴에서 **OAuth2 → URL 재생기** 하위에 있는 **SCOPES**에서 `bot` 체크

<img src="./docs/image5.png">

2. **BOT PERMISSIONS**에서 아래 권한 체크
   - View Channels(채널 보기)
   - Send Messages(메시지 보내기)
   - Read Message History (메시지 기록 보기 - 선택)

<img src="./docs/image6.png">

3. 하단에 생성된 URL을 복사해 브라우저에서 열기

<img src="./docs/image7.png">

4. 봇을 추가할 서버 선택 → 권한 승인


### 5. 서버 실행

`.env`에 `DISCORD_BOT_TOKEN`을 설정한 뒤 서버를 (재)시작하면 콘솔에 `[Discord] 어댑터 시작됨`이 출력됩니다.

> 💡 명령어 사용법은 위의 [Discord 봇 사용법](#-discord-봇-사용법)을 참고하세요. 모든 메시지에 응답하지 않으므로 일반 대화 채널에 초대해도 괜찮습니다.

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
- **Discord 봇:** discord.js

---

## ☁️ 배포

봇이 외부에서 메시지를 받으려면 서버가 항상 켜져 있어야 합니다.

### 원클릭 배포

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Too-Much-I/faq-anywhere)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/Too-Much-I/faq-anywhere)

> ⚠️ 버튼을 누른 후에도 아래 환경변수는 직접 입력해야 합니다.
> - `ADMIN_PASSWORD` — 어드민 페이지 비밀번호
> - `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN` — [Slack 앱](https://api.slack.com/apps)에서 발급
> - `DISCORD_BOT_TOKEN` — [Discord Developer Portal](https://discord.com/developers/applications)에서 발급 (설정 방법은 [Discord 봇 설정](#-discord-봇-설정) 참고)

### 수동 배포

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
