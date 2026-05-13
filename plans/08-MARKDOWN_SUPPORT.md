# Objective
Update the Gemini CLI frontend chat interface to render messages as Markdown instead of raw text, enhancing readability for agent responses that include formatting, code blocks, or tables.

# Key Files & Context
- `apps/frontend/package.json`: Will be updated to include `react-markdown` and `remark-gfm` as dependencies.
- `apps/frontend/src/routes/tickets.$ticketId.tsx`: The chat interface component that currently renders raw text `msg.content` and `streamingContent`.

# Implementation Steps
1. **Install Dependencies:**
   - [x] Run `pnpm add react-markdown remark-gfm` in the `apps/frontend` directory.

2. **Refactor Chat Component:**
   - [x] In `apps/frontend/src/routes/tickets.$ticketId.tsx`, import `ReactMarkdown` from `react-markdown` and `remarkGfm` from `remark-gfm`.
   - [x] Update the static message rendering to replace `{msg.content}` with a `<ReactMarkdown>` block.
   - [x] Update the streaming message rendering to replace `{streamingContent}` with a similar `<ReactMarkdown>` block.

3. **Styling and Overflow Management:**
   - [x] Install `@tailwindcss/typography` as a devDependency in `apps/frontend/package.json` and add it to `tailwind.config.js` plugins list.

# Verification & Testing
- Load a ticket and generate a response from an agent that includes bold text, lists, tables, and a code block.
- Verify that both completed messages and streaming messages render correctly in markdown formats.
- Verify that the chat bubble styles (background colors, rounded corners) remain intact and contain the markdown content without layout breakage.