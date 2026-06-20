# DEEP RESEARCH COMMISSION

## Research Question

What is the single most in-demand, high-willingness-to-pay, viral-potential software chess tool or feature that does not yet exist as a dominant product — a tool that would go globally viral immediately on launch because of how intensely and broadly chess players of all levels want it?

## Purpose & Context

The global chess software market was valued at $3.45 billion in 2025 and is projected to reach $7.66 billion by 2034 (CAGR 9.28%) [market reports]. Chess.com alone surpassed 250 million registered users and generates an estimated $500M+ annually. Yet despite this massive and growing market, a systematic analysis reveals critical unmet needs that no single product has fully addressed.

This research is commissioned to identify the highest-leverage product opportunity in chess software: the tool or feature that sits at the intersection of (a) overwhelming user demand, (b) proven willingness to pay, (c) insufficient existing supply, and (d) inherent viral mechanics. The result will inform a product-build decision.

### Audience
- **Primary:** A technical founder building a chess software product — needs actionable, evidence-backed product direction
- **Secondary:** Chess enthusiasts, product managers in edtech/gaming, investors evaluating chess tech
- **Tone:** Data-driven, precise, direct — every claim cited
- **Complexity:** Technical enough for a developer to implement from, accessible for a club-level chess player
- **Child-reader adaptivity:** Inline [imagine: ...] explanations for all hard concepts

### Decision Context
- What product should be built next?
- What feature has the highest ratio of demand-to-supply?
- What would justify a $5-15/month subscription from 1M+ users?
- What feature has built-in viral loop mechanics (share-worthy, demonstrable, referable)?

## Research Scope

### In Scope
- Chess software features/tools that address pain points for non-professional players (below GM level)
- Features where existing solutions are fragmented, expensive, poor UX, or non-existent
- Features with demonstrated willingness to pay (existing paid products, subscription models, crowdfunding)
- Features with viral potential (shareable moments, "wow" factor, social proof mechanics)
- Both standalone products AND features that could be added to an existing platform
- AI/ML-powered tools (LLM + chess engine hybrids)
- Training/learning/coaching tools
- Analysis and game-review tools
- Opening preparation and repertoire management tools
- Consumer-facing tools (not enterprise/B2B chess)

### Out of Scope
- Physical chess equipment (boards, pieces, clocks)
- Tournament organization software (B2B)
- Chess content creation tools (streaming, video production)
- Cryptocurrency/blockchain chess games (e.g., Pixie Chess, Anichess)
- Pure game-play platforms (another Chess.com/Lichess clone)
- Chess engine development (Stockfish, Leela)

### Timeframe
Primary: 2024-2026 (current state). Secondary: 2020-2023 (how needs evolved). Foundational sources (pre-2020) only for context.

### Geographic Focus
Global, with emphasis on English-language markets (US, UK, Canada, Australia, India, EU). Note geographic variations where relevant.

## Required Dimensions of Investigation

### 1. Technical/Mechanistic Exploration
- How does an AI chess coach that explains moves in natural language actually work under the hood? What's the architecture (Stockfish/engine for evaluation → LLM for explanation → guardrails against hallucination)?
- How do spaced-repetition opening trainers work? What algorithms are used (FSRS, SM-2, Leitner)? How is active recall implemented on a chess board?
- What's the technical architecture of game analysis pipelines that connect Chess.com/Lichess APIs, run Stockfish, and produce human-readable reports?
- How do existing products (WhyThisMove, DecodeChess, Notation, Chessvia, Nova Chess) differ in their technical approach to AI coaching? Which approaches avoid LLM hallucination on chess positions?

### 2. Historical Context & Evolution
- How did chess analysis tools evolve from ChessBase (1990s) to modern AI-powered coaching?
- What was the trajectory of "explainable AI" in chess — from DecodeChess (2018) founding to the explosion of LLM-based coaches in 2024-2026?
- How did the opening trainer space evolve from Chessable (acquired by Chess.com for $50M+) to 10+ competitors (Openings.gg, ChessAtlas, Chessbook, ZenChess, etc.)?
- What lessons can be learned from failed chess startups and products that didn't gain traction?

### 3. Current State-of-Art
- What are ALL existing AI chess coach products in 2026? Map them: WhyThisMove, DecodeChess, Notation, Chessvia, Nova Chess, AICoachess, ChessGPT/ChessLine, Chessfeed.ai, edmozley/chess, Iamsdt/chess — and their feature sets, pricing, user bases, traction signals.
- What are ALL existing opening trainer products in 2026? Map them: Chessable, Openings.gg, ChessAtlas, Chessbook, ZenChess, ChessEcho, Chess Prep Pro, ChessFlare, ChessOpeningsMastery, chess-analysis.org — feature sets, pricing, traction.
- What AI coaching features has Chess.com actually shipped? What has Duolingo Chess shipped?
- What is the state of LLM hallucination on chess positions — which models/approaches reliably avoid making up moves?

### 4. Quantitative Evidence
- Market sizes: Chess software market $3.45B (2025) → $7.66B (2034). Chess learning platforms $2.8B (2025) → $7.6B (2034). Online chess instruction $270M (2026) → $686M (2035).
- Subscription ARPU: $80-110/year for chess premium. Freemium conversion rates: 4-8%. Chess.com Diamond: $12.50/mo, Platinum: $6.67/mo.
- Willingness to pay data: What do users actually pay for? Aimchess ($8-15/mo), Chessable ($10-100+ per course), Chess.com Premium ($5-12.50/mo).
- Traffic/traction data for existing AI coach products: Website traffic, GitHub stars, App Store rankings, funding rounds raised.
- Survey data on feature demand from chess forums, Reddit, feature request boards. Quantify what % of users request what features.
- Number of products launched in each category in 2025-2026 as a proxy for market belief.

### 5. Stakeholder & Actor Analysis
- Who are the key competitors in AI chess coaching? Map their funding, team size, tech stack, traction.
- Who are the key competitors in opening training? Map the same.
- Who are the major platforms (Chess.com, Lichess, ChessBase) and what are they NOT doing that leaves room for competitors?
- What is the role of open-source projects (En Croissant, Pawn Appétit, Stockfish WASM) in commoditizing features?
- Who are the angel investors and VCs funding chess tech (e.g., $4.8M for Endgame.ai, $5.2M for Pixie Chess, $50M+ Chessable acquisition)?
- What is the developer/creator community building in chess (GitHub repos, Hackathon projects)?

### 6. Competing Approaches Comparison
- AI coach: LLM-based (WhyThisMove, Chessvia) vs hand-tuned classifiers + LLM for articulation only (Notation) vs template-based (DecodeChess's Explainable AI). Trade-offs in quality, hallucination risk, cost, latency.
- Opening trainer: Spaced repetition (FSRS vs SM-2 vs Leitner). Active recall vs passive browsing. Cloud-based vs local.
- Architecture: Cloud API (OpenAI/Anthropic/Groq) vs local LLM vs hybrid. Cost per analysis, latency, privacy implications.
- All-in-one platform vs specialized single-purpose tool — which works better for user acquisition and retention?
- Free (Lichess) vs freemium (Chess.com) vs paid-only (Chessable courses, ChessBase) — which monetization model suits which feature?

### 7. Criticisms & Limitations
- Why has no AI coach product achieved mass adoption yet? What's blocking them?
- Specific criticisms from user reviews and forum threads about existing products: cost, accuracy, depth, UX friction.
- What are the failure modes of LLM-based chess coaching? Hallucinating moves, giving bad advice, being too generic.
- What are the limitations of spaced-repetition opening trainers? Do they actually improve OTB performance? What's the evidence?
- Why do most chess startups fail? What specific risks apply to coaching/analysis tools?

### 8. Contrarian & Heterodox Perspectives
- "Chess players don't actually want to improve — they just want to play." Do most players actually use training features?
- "Stockfish + YouTube is good enough for 90% of players." Is there a real market for AI coaching beyond early adopters?
- "The opening trainer market is already saturated." Are there really 10+ products serving this need adequately, or are they all missing something crucial?
- "AI coaching is a gimmick — human coaches can never be replaced." What is the actual ceiling for AI coaching?
- "The viral moment for chess (Queen's Gambit) is over. Growth is slowing." Is the chess market still expanding?

### 9. Future Trajectories & Predictions
- How will AI model improvements (GPT-5, Claude 4, Gemini Ultra) change what's possible for AI chess coaching in 2026-2028?
- Will voice-based AI coaching (like Notation's "Nadia") become the dominant interface?
- Can a "Duolingo for chess" with gamification + AI coaching achieve the same growth trajectory Duolingo Chess saw (millions of users in 3 months)?
- What would a combined AI coach + opening trainer + game analysis platform look like? Is this the ultimate product?
- What could disrupt this space? (e.g., Chess.com acquiring and integrating AI coaching natively, open-source alternatives reaching parity)

### 10. Regulatory, Legal & Ethical Dimensions
- Data privacy: Users' chess games are relatively low-sensitivity data, but connecting Chess.com/Lichess accounts raises API terms-of-service questions.
- Chess.com's API terms: What can and can't third-party tools do with user data from Chess.com?
- LLM safety: Can an AI coach give bad advice that makes a player worse? Is there liability?
- Anti-cheating: Could AI coaching tools be used for cheating in online games? How do products handle this?
- Cost of AI inference: Who pays for the LLM API calls? Is this viable at scale?

### 11. Geographic & Geopolitical Variation
- US vs Europe vs India vs rest-of-world in chess software demand. What features resonate where?
- India: Massive growing market (Viswanathan Anand effect, 600M+ mobile users). What features do Indian players want?
- Europe: Deep chess culture, older player base, higher willingness to pay. Desktop-focused?
- US: Streamer-driven culture, mobile-first, younger demographic.
- Language support: Which products support how many languages? Is multilingual a differentiator?

### 12. Practical Applications & Case Studies
- Deep-dive case study: WhyThisMove — what did they get right/wrong? Traction? Pricing?
- Deep-dive case study: Notation Chess Coach — the hand-tuned classifier + LLM approach. Is this the right architecture?
- Deep-dive case study: ChessAtlas vs Openings.gg vs Chessbook — which opening trainer is winning and why?
- Deep-dive case study: Duolingo Chess — how did they get millions of users in 3 months? What does this prove about demand?
- Deep-dive case study: Endgame.ai (Hans Niemann's $4.8M startup) — what are they building? Is there demand for another full platform?
- Deep-dive case study: DecodeChess — founded 2018, first-mover in explainable chess AI. Still alive? Traction?
- Case studies of indie developers who built chess tools that gained traction (e.g., En Croissant, Pawn Appétit, edmozley/chess).

## Source Requirements

### Source Types Required (ALL must be represented)
- **Product websites and documentation** (WhyThisMove, DecodeChess, Notation, Chessvia, Nova Chess, AICoachess, ChessGPT, Chessfeed.ai, Openings.gg, ChessAtlas, Chessbook, ZenChess, ChessEcho, Chess Prep Pro, ChessFlare, ChessOpeningsMastery)
- **Market research reports** (Dataintelo, Market Intelo, Verified Market Reports, Fortune Business Insights, Growth Market Reports)
- **User-generated content** (Chess.com forums, Reddit r/chess, Hacker News, feature request boards, app store reviews)
- **News and analysis** (attackingchess.com, CircleChess, CheckmateX, ChessBase news, TechCrunch, Fast Company, GamesBeat)
- **Academic sources** (LLM evaluation on chess tasks, spaced repetition research, chess pedagogy studies)
- **GitHub/open-source** (En Croissant, Pawn Appétit, edmozley/chess, Iamsdt/chess, Stockfish WASM projects)
- **Funding/investor data** (Crunchbase, PitchBook for chess startup funding rounds)
- **Survey data** (Chess.com surveys, Lichess donation data, willingness-to-pay studies)

### Minimum Source Count: 270+ — Level 1 initial sources should themselves aim for >=270 relentlessly. Multi-level BFS expansion (following links/references/ideas from each source to generate further sources, iteratively) is used only when Level 1 falls short.

### Source Diversity Requirements
- At least 5 different source types must be represented
- Mix of recent (2025-2026) and foundational (pre-2025) sources
- Both proponents AND critics of each approach must be cited
- Geographic diversity (not US-only)
- User/community sources (forums, Reddit, app reviews) are essential — this research is about user demand
- If a source type is unavailable, document the gap explicitly

## Output Requirements

### Report Structure
1. **Executive Summary (1000-1500 words)** — Synthesize ALL major findings, identify the single highest-opportunity product, explain why it would go viral, quantify the market opportunity, and give a clear recommendation
2. **Introduction** — Scope, methodology, assumptions, key terms defined with ELI5
3. **Main Analysis (6-10 findings, 600-2000 words each)**
   - Finding 1: The AI Natural Language Coach Market — landscape, competitors, traction
   - Finding 2: The Opening Repertoire Trainer Market — landscape, competitors, traction
   - Finding 3: User Pain Points & Feature Demand Analysis — what players are actually asking for
   - Finding 4: Willingness to Pay & Monetization Models — what works, what doesn't
   - Finding 5: Technical Architecture Options — how to build it right
   - Finding 6: Viral Loop Mechanics — what makes chess tools spread
   - Finding 7: The Winning Product Thesis — the specific tool/feature recommendation
   - Finding 8: Risk Analysis & Failure Modes
   - (Additional findings as needed)
4. **Synthesis & Insights** — Cross-cutting patterns, novel connections, the "white space" identified
5. **Limitations & Caveats** — Gaps, uncertainties, contradictory evidence
6. **Recommendations** — Actionable guidance: what to build, for whom, at what price, with what tech stack
7. **Complete Bibliography** — Every citation [1]-[N], no placeholders
8. **Methodology Appendix** — Research process, verification, confidence levels

### Quality Mandates
- EVERY factual claim followed by [N] citation in the same sentence
- No vague attributions ("research shows", "experts believe", "studies suggest")
- Distinguish facts FROM sources vs. your own synthesis explicitly
- For speculative content, label as "[SPECULATION]" not "Research shows..."
- Minimum 3 independent sources per major claim
- Prose >=80%, bullets sparingly (only for distinct lists)
- No placeholder text, no "content continues", no ranges in bibliography
- Admit uncertainty: "No sources found for X" rather than fabricating
- Inline [imagine: ...] explanations for every concept a 9-year-old might not understand

### Bias Safeguards
- Actively seek sources that contradict the "AI coach is the killer app" thesis
- Flag when sources have financial or ideological interests (e.g., a product's own website)
- Note when research is sparse — don't fill gaps with speculation
- Distinguish correlation from causation
- Mark predictions/forecasts as [SPECULATION] not [FACT]

## Seed Keywords

**Core demand signals:** "chess explain why move is good/bad", "chess natural language analysis", "chess AI coach", "why does stockfish recommend this", "chess tool people would pay for", "most requested chess feature", "chess app missing feature", "chess training tool demand"

**AI coaching:** "WhyThisMove", "DecodeChess", "Notation chess coach", "Chessvia", "Nova Chess", "AICoachess", "ChessGPT", "chessfeed.ai", "edmozley/chess", "Iamsdt/chess", "Chess King", "AI chess tutor", "LLM chess analysis", "explainable AI chess", "chess coach app", "chess analysis explained", "chess AI vs human coach"

**Opening trainers:** "Chessable", "Openings.gg", "ChessAtlas", "Chessbook", "ZenChess", "ChessEcho", "Chess Prep Pro", "ChessFlare", "ChessOpeningsMastery", "chess opening trainer spaced repetition", "FSRS chess", "active recall chess openings", "opening repertoire trainer", "chess opening memorization tool"

**Market data:** "chess software market size 2025 2026", "chess learning platform market", "chess app revenue", "chess.com subscription pricing", "chess market CAGR", "chess startup funding", "chess app monetization"

**User demand:** "chess.com feature request", "lichess feature request", "reddit chess what feature", "chess forum most wanted feature", "chess app review complaints", "chess players want", "chess pain points"

**Technical:** "Stockfish WASM", "chess LLM hallucination", "chess engine + LLM architecture", "chess API", "chess.com API integration", "chess analysis pipeline", "FSRS algorithm chess"

**Contrarian:** "chess AI coach not accurate", "chess training tools don't work", "chess improvement plateau", "chess app market saturated", "chess viral moment over", "players don't want to study chess"

## Mode

Deep Research (8-phase pipeline, multi-level BFS expansion, 270+ sources)
