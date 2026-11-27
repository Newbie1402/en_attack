# SnowGraph — Codex Agent kit

This archive contains specifications and art references, not the implemented game. Extract its contents into the root of a new or existing repository. Keep `.codex/` (hidden folder), `AGENTS.md`, `SUPER_PROMPT.md`, and `references/` together. If the repository already has an AGENTS.md or .codex instructions, merge/reconcile rather than blindly overwrite.

Open the repo in Codex and send the following instruction:

> Read AGENTS.md, SUPER_PROMPT.md, all explicitly referenced .codex Markdown documents, and inspect the three reference images in references/. Follow the approved art direction and detailed design. Inspect the existing project and git status, start Phase 00 or resume the first incomplete phase, implement and verify each phase in order. Continue as far as your execution budget permits without skipping gates. Update .codex/08-PROGRESS.md and .codex/09-DECISIONS.md with actual evidence. Do not stop at a proposal, do not claim unrun tests, do not commit/push/deploy without my approval.

When resuming a later task, tell the agent to read AGENTS.md and progress and resume first incomplete gate. The kit's numeric values and six-level MVP scope are provisional design defaults; owner can change them. The reference images are guidance, not production sprites. No actual code/test/build has been run in this kit.
