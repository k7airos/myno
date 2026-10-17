# Changelog

## v0.4.4

- Stabilize opening heading margins across unfocused, cursor-focused, and text-selected states, covering ProseMirror virtual cursor and non-editable widgets.

## v0.4.3

- Fix opening heading top gap when ProseMirror-widget is present in unfocused editor state.
- Prevent document vertical jump when selecting text and triggering inline formatting toolbar.

## v0.4.1

- Bind image-ratio metadata only to its originally adjacent image without consuming earlier consecutive comments.
- Reject non-reversible ratio metadata during parsing, preserving the original comment and image instead of failing later serialization.

## v0.4.0

- Preserve descriptive image alt text, titles, node order and block-image resizing through Markdown round trips.
- Store non-default descriptive-image ratios in adjacent versioned metadata shared by the editor, Studio source preview and browser export, while retaining numeric-alt ratio syntax.

## v0.3.2

- Preserve Markdown images without a title when Milkdown validates image attributes.
- Share title normalization across the editor, Studio source preview, and browser export; image loading failures do not remove source nodes.

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
