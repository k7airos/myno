# Changelog

## v0.3.1

- Own article typography and default theme tokens in `src/styles/`.
- Export pure CSS through `@akairos/myno/article.css`, `@akairos/myno/tokens-default.css`, and `@akairos/myno/style`.
- Keep table headers on one line and allow horizontal scrolling while body cells wrap.
- Remove the standalone article-style package dependency.

## 0.3.0 (2026-10-15)

- Add the optional Pipeline adapter with packaged Studio and browser rendering entries.
- Initialize Studio independently with local themes, syntax guides, and sample content; prefer Pipeline configuration when available.
- Keep editing, config import/export, and rich-text copying available without a backend.
- Preserve user-written content when host configuration arrives after initialization.
- Include the editor extension slots, image upload integration, runtime style configuration, and inline mark fixes from 0.2.x.
