# Design system

The look of the app is defined in one place, `app/design-system.css`. Components and pages use its tokens and
classes. They do not set colours, radii or shadows directly.

## Files

| File | What goes there |
| ---- | --------------- |
| `app/design-system.css` | Tokens (`:root`), base element rules, and shared building blocks: buttons, inputs, cards, panels, badges, the round checkbox. |
| `app/globals.css` | Page layout and components that only belong to one screen: top navigation, the task list, the add form, the mobile bottom bar and sheet, the auth card. It imports the design system first. |
| `components/*.tsx` | Markup and behaviour. Class names only. No inline colours or sizes. |

## Principles

- **Dark only.** The app is always dark. There is no light theme.
- **Soft and rounded.** Cards use `--radius-md` (20px). Buttons and inputs use `--radius-sm` (14px). Chips and badges
  are pills (`--radius-pill`).
- **One accent.** `--accent` (purple) marks the primary action, the active tab, the checked box and the focused
  menu item. Don't use it for decoration.
- **Status colours carry meaning.** Priority uses `--high`, `--medium` and `--normal`. Don't reuse them for other things.
- **Inputs are 16px.** Smaller text makes iOS zoom in on focus.
- **Mobile first.** Layouts are checked at phone width first. The bottom bar appears at 720px and below.

## Tokens

Colours: `--bg`, `--card`, `--card-2`, `--border`, `--text`, `--muted`, `--accent`, `--accent-soft`, `--danger`,
`--high`, `--medium`, `--normal`, `--done`, `--todo`.

Shape and depth: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`, `--shadow-card`, `--shadow-float`.

Spacing: `--space-1` (4px) to `--space-6` (24px). Use these for padding and gaps.

Type: `--font-sans`, `--text-xs` (12px) to `--text-xl` (22px).

To change the look, change a token. Every screen follows.

## Building blocks

| Class | Use |
| ----- | --- |
| `button` | Primary action. |
| `button.ghost` | Text-style action, such as Edit, Cancel or Log out. |
| `button.danger` | Destructive text action. Combine with `.ghost` for a quiet delete. |
| `input`, `select` | Text fields and selects. Style them with the element selector. |
| `.card` | A surface with the card radius and shadow. |
| `.panel` | A card with padding and bottom margin, used for settings sections. |
| `.badge`, `.badge.high`, `.badge.medium`, `.badge.normal` | Priority labels. |
| `.check` | Round checkbox for completing a task. |
| `.muted`, `.error` | Secondary text and error text. |
| `.row` | Horizontal group with wrapping and gaps. |

## Rules for changes

1. Put a new colour, size or radius in `design-system.css` as a token first, then use it.
2. A component used on more than one screen goes in `design-system.css`. A component used on one screen goes in
   `globals.css`.
3. Don't use raw hex values or pixel radii in components. Use the tokens.
4. When you change a token, check the task list, the add sheet, Settings and the login card.
