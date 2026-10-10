# Bundled fonts

Only the Latin subset, WOFF2, is vendored so the module works offline and stays small (~68 kB total).

| File | Font | Licence |
| --- | --- | --- |
| `andika-latin-400.woff2`, `andika-latin-700.woff2` | Andika (SIL International), designed for early literacy: single-storey a/g, clear I/l | SIL Open Font License 1.1 (`LICENSE-Andika.txt`) |
| `fredoka-latin-wght.woff2` | Fredoka (variable weight) | SIL Open Font License 1.1 (`LICENSE-Fredoka.txt`) |

Source: the `@fontsource/andika` and `@fontsource-variable/fredoka` npm packages.

Adding Hindi later? Add a Devanagari-capable font (for example Noto Sans Devanagari) as another `@font-face` in `playlab.css` and put it in the `font-family` stacks.
