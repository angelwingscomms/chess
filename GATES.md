# Gates: gemini-primary openai-live paid alt

OWNS: src/components/learn/**, src/routes/api/voice/**, src/lib/util/chat/tools/**, src/lib/util/ai/pricing/**, src/lib/util/voice/**, src/routes/chess/learn/learn.e2e.test.ts, src/routes/+page.svelte, src/components/LearnPage.svelte, src/routes/og/+server.ts, AGENTS.md, package.json, pnpm-workspace.yaml, pnpm-lock.yaml, GATES.md, scripts/check_voice_live.mjs

Scope: keep Gemini Live as the default voice coach and add OpenAI GPT-Live as a paid alternative that never uses OpenRouter

- [x] G1: Gemini Live remains the default provider and still connects with @google/genai
  CHECK: node scripts/check_voice_live.mjs gemini-primary
  EXPECT: gemini-primary passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=a99f59eebcb19447e6e855548586f93ab236692f9ea73bb351f1da1b8e070517; exit=0; EXPECT=matched; output-sha256=f2cccc158d94346aed7e2591d9fcb879115cc150ac121c222a0c147f8bc10db3; output-bytes=22; shell=/bin/sh; cwd=/home/ed/i/e4; path=9148fe13a103/41 entries

- [x] G2: OpenAI Live session is created on the server against api.openai.com, not OpenRouter
  CHECK: node scripts/check_voice_live.mjs openai-session
  EXPECT: openai-session passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=ad31b593c3874c6f5e013796582c71232899838f8632a95e0bdac844f2ebbfd8; exit=0; EXPECT=matched; output-sha256=6ef86f869a166eb948a9f57948f02a360f455dc9e647e58aecf93090d88da14f; output-bytes=22; shell=/bin/sh; cwd=/home/ed/i/e4; path=9148fe13a103/41 entries

- [x] G3: OpenAI Live uses client delegation and the existing chess tools
  CHECK: node scripts/check_voice_live.mjs openai-delegation
  EXPECT: openai-delegation passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=0d05c9e9e3ec423fd93b0b9ab06641450ecd5e4aa9f59fa0cee91e7f60101d75; exit=0; EXPECT=matched; output-sha256=851646320b94699f5a23dadb6430850e3239386bee742c27544726d5f28549ac; output-bytes=25; shell=/bin/sh; cwd=/home/ed/i/e4; path=9148fe13a103/41 entries

- [x] G4: unused STT, TTS, and timestamps are gone
  CHECK: node scripts/check_voice_live.mjs dead-removed
  EXPECT: dead-removed passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=a9da55509e23be109b742a10514cb56b959926a60bd2c6ec46599bcd620cff3e; exit=0; EXPECT=matched; output-sha256=c4fc74519259db3d8ffc6e9faaecad69a6755720080708a7f5c93f5505c162f4; output-bytes=20; shell=/bin/sh; cwd=/home/ed/i/e4; path=9148fe13a103/41 entries

- [x] G5: static voice tests pass
  CHECK: pnpm exec vitest run --pool=threads src/routes/chess/learn/learn.e2e.test.ts src/lib/util/ai/pricing/pricing.test.ts src/routes/chess/learn/chat/chat.test.ts src/lib/util/voice/openai_live.test.ts
  EXPECT: Test Files  4 passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=85ae9d851b77d0c469c7e83fa9d6d7785a7e68ebff1058d74d451b4ed66fdf1a; exit=0; EXPECT=matched; output-sha256=4919dcb7013d30fb1d4edb92d16addc23626fe2a8736dda17b134f0726d81907; output-bytes=390; shell=/bin/sh; cwd=/home/ed/i/e4; path=9148fe13a103/41 entries
