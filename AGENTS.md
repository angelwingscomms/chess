# Example Files

- src/lib/components/resource/ResourceCard.svelte
- src/lib/components/resource/ResourceSearch.svelte
- src/lib/components/resource/index.ts
- src/lib/components/resource/test.ts
- src/lib/types/resource.ts
- src/lib/util/resource/utility_name/index.ts
- src/lib/util/resource/utility_name/test.ts
- src/routes/~/resource/[i]/edit/+page.server.ts
- src/routes/~/resource/[i]/edit/+page.svelte
- src/routes/~/resource/[i]/+page.server.ts
- src/routes/~/resource/[i]/+server.ts
- src/routes/~/resource/create/+page.server.ts
- src/routes/~/resource/+page.server.ts

# General

- always search net before doing anything, especially when there's an error in question
- always code with extreme simplicity; be minimalist
- always search the net when it might help
- always follow the patterns in the example files perfectly
- if a new pattern is decided, update the example files
- speak extremely concisely; explain things like i'm 9 years old
- code like an expert deep learning engineer with uncompromisable perfection
- never run `npm run build`

# Code Style

- Naming: always snake_case for vars/functions; make db payload, type defs, request JSON and page load return value keys always single letters.
- Styling: Tailwind utilities only; no inline styles/style blocks
- DB/Qdrant: Multi-tenancy, single collection 'i'; tenant-id on payload field `s`
- Conciseness: no vars for single-use; code minimally
- never start the dev server
- always write failing unit and e2e tests before implementing a feature/fix and then run tests after implementing
- fonts go in static/fonts

# Git Workflow

- before every code change turn: `git add .; git commit -m"before AI agent {short_update_name} update. agent: {your name}"; git push`
  - short update name ≤3 words; don't worry if push fails, the commit is what matters
- after every edit turn: `git add .` and make a long commit exhaustively explaining every change in detail, then run `git push`

# Svelte MCP

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project./

# SEO Patterns

- every page must include `<Seo>` component with unique `t` (title) and `d` (description)
- internal/test-only pages must set `n: true` (noindex)
- pages with user-facing content get `<JsonLd>` structured data (WebSite in layout, SoftwareApplication on home, etc.)
- og:image auto-generated via `/og?t=TITLE` endpoint; no need to set `o.i` unless custom image needed
- use single-letter keys on SeoMeta type defs: `t`=title, `d`=description, `c`=canonical, `o`=og, `w`=twitter, `n`=noindex
- canonical URL auto-derived from `PUBLIC_DOMAIN` env var + current path; override via `c` only if needed
- SEOMeta type defined in `src/lib/types/seo.ts`; Seo component in `src/lib/components/seo/Seo.svelte`
