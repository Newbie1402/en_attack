# SnowGraph visual QA checklist

## Required captures

- Main menu.
- Spring active wave.
- Winter active wave.
- Multiple swallows and a Lucky Nest.
- Snowball flight and combat impact.
- Available pickup and collection.
- Active Freeze and boss route.
- Victory/defeat lifecycle.
- 1440×900, 1920×1080, 1366×768 and 1280×720 responsive gameplay.

## Review rubric

Score 0–10 with screenshot evidence: mascot fidelity, environment, HUD, animation, combat feedback,
pickup interaction, consistency, readability, responsive layout and overall craftsmanship. A score is not
accepted without noting the screenshot path, observed defect and corrective change.

## Technical checks

- No browser console errors during route changes.
- One Phaser canvas per gameplay mount.
- No duplicate simulation clocks or listeners after retry/unmount.
- No permanent graph axes on campaign maps.
- Local assets only; no remote image/script requests.
- `npm run verify` and the full Playwright suite pass before the phase is called complete.
