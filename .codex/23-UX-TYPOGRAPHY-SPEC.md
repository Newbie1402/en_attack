# V3 UX and typography specification

Gameplay UI uses Vietnamese sentence-case copy, a compact HUD, two-column battlefield composition and a
formula lab attached to the selected unit. The editor distinguishes draft text from the committed formula,
shows attack status and reports ownership conflicts in context. Enter and `Gắn công thức`/`Áp dụng công
thức` commit a candidate; incomplete input never changes simulation state.

The runtime uses local/system rounded sans-serif fallbacks for readable Vietnamese glyphs and reserves
monospace for formula text. Gameplay no longer exposes a repeated manual Fire action as its primary call
to action. Focus rings, disabled states, placement cancellation and visible error feedback are required.
