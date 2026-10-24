# Design system

The app is styled with Tailwind CSS (v3). The palettes, radii and base component styles come from
[Tailus UI](https://github.com/Tailus-UI/ui.tailus.io) through `@tailus/themer`. The shared classes are in one place,
`components/ui/styles.ts`. Components use those classes and Tailwind utilities. They do not write hex values.

## Files

| File | What goes there |
| ---- | --------------- |
| `tailwind.config.ts` | Tailus plugins (palettes, radii, shades, animations). Content paths. |
| `app/globals.css` | Tailwind directives, the body background, the round task checkbox (`.check`). |
| `components/ui/styles.ts` | Shared class recipes: buttons, fields, cards, badges, icon buttons, dialogs, page layout, auth card. |
| `components/ui/cn.ts` | `cn()`: joins class names and resolves conflicts (`tailwind-merge`). |
| `components/ui/Button.tsx`, `Sheet.tsx`, `icons.tsx` | Components used on more than one screen. |
| `components/*.tsx` | Markup and behaviour. Utility classes and the recipes above. |

## Principles

- **Dark only.** The app is always dark. There is no light theme. Write dark colours directly, without `dark:` variants.
- **Soft and rounded.** Cards use `rounded-xl`. Buttons and fields use `rounded-lg`. Chips and badges are small pills.
- **One accent.** The primary purple (Tailus `mystery` palette, set with `data-palette="mystery"` on `<html>`) marks the
  primary action, the active tab, the checked box and the focused field. Don't use it for decoration.
- **Status colours carry meaning.** Priority uses `danger` (high), `warning` (medium) and `gray` (normal). Don't reuse
  them for other things.
- **Inputs are 16px.** Smaller text makes iOS zoom in on focus. `globals.css` enforces this for `input`, `select` and
  `textarea`.
- **Mobile first.** Layouts are checked at phone width first. The bottom bar and the bottom sheets appear at 720px and
  below (`max-[720px]:`). Sheets are centred from 721px (`min-[721px]:`).

## Building blocks

| Export | Use |
| ------ | --- |
| `buttonClass({ variant, intent, size })` | Any button or link that looks like a button. `variant`: `solid`, `soft`, `outlined`, `ghost`. `intent`: `primary`, `danger`, `gray`. `size`: `xs` to `lg`. |
| `<Button>` | A `<button>` with those options. |
| `field` | Text fields, selects. Add `textareaField` for textareas. |
| `card` | A surface with the card radius, border and shadow. |
| `iconButton`, `iconButtonDanger` | Icon-only buttons, such as edit and delete. |
| `badgeClass(tone)` | Priority and board labels: `high`, `medium`, `normal`, `board`. |
| `<Sheet>` | A dialog: a bottom sheet on phones, centred on wider screens. |
| `pageMain` | The main column of every page. |
| `headingText`, `mutedText`, `errorText` | Headings, secondary text and error text. |

## Rules for changes

1. A colour, size or radius used on more than one screen goes in `components/ui/styles.ts`. Change it there, and every
   screen follows.
2. A utility class is fine for a one-off layout on one screen. Don't copy a recipe into a component. Import it.
3. Don't use raw hex values in components. Use the palette classes (`primary-*`, `gray-*`, `danger-*`, `warning-*`).
4. Keep the classes that the tests and end-to-end specs select: `item` on list rows, `board-bar` on the board row,
   `options-scrim` on the options backdrop, and `check` on the task checkbox.
5. When you change a shared recipe, check the task list, the add sheet, the note screens, Settings, Options and the login
   card, at desktop and phone width.
