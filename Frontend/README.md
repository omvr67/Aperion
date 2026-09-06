# Aperion Frontend Prototype

Aperion's first UI prototype: a fast, dependency-free frontend designed to explore the final macOS application's interaction model before implementing the native SwiftUI version.

## Run

No installation is required.

Open `index.html` in a browser, or serve the folder locally:

```bash
cd Aperion-Frontend
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## What is implemented

The prototype follows the current Aperion specification:

- Five primary destinations: All Tasks, Favorites, Search, Recently Deleted, Settings.
- Project navigation with one level of sub-project support.
- Sections inside projects.
- Tasks with completion, notes, priority, favorites, projects, sections and links.
- One-level subtasks.
- Fast task creation/editing.
- Drag-and-drop task reordering and moving.
- Recently Deleted with restore.
- Undo for destructive task deletion.
- Instant global search and recent searches.
- Light/dark/system appearance.
- Local persistence using `localStorage`.
- No backend, account, cloud service or external dependency.

## Important

This is a **UI/interaction prototype**, not the final Aperion architecture.

The production app should replace the browser persistence layer with the already-validated Aperion Core concepts and then SwiftData. The UI structure is intentionally close to the future SwiftUI component boundaries so the prototype can be used as a design reference during implementation.

## Suggested next step

Once the visual direction is approved, freeze the interaction/design specification and begin the native SwiftUI project in Xcode. The prototype should not become a second production codebase.

## Changes in this pass

Applied a batch of the frontend improvement brief, focused on interaction polish rather than new surface area. See `improvements.patch` for the exact diff.

- **Fixed a real bug**: `index.html` expects `js/app.js`, but the script lived at the project root, so the prototype 404'd on load. `app.js` now lives at `js/app.js`.
- **Fixed a real bug**: subtasks were being counted and rendered as their own top-level rows in All Tasks / Favorites / project views, on top of appearing nested in their parent's modal. They're now excluded from the primary lists, and a task row shows a small `done/total` subtask badge instead.
- Context menus (right-click) on tasks — mark done, favorite, edit, move to another project, delete — and on projects — new task, edit.
- Keyboard-first list navigation: ↑/↓ to move through tasks, Enter to open, Space to toggle done, F to favorite, Backspace/Delete to remove — all scoped off while typing or with an overlay open.
- Inline task rename via double-click on the title (a short delay disambiguates it from the normal single-click-to-open).
- Return now commits instantly from the task title field and the "add a subtask" field, instead of requiring a click on Save.
- Drag-and-drop got a real insertion-line indicator (before/after) instead of a full-row highlight, plus the ability to drop a task directly onto a project in the sidebar (or onto Favorites) to re-home it.
- Recently Deleted got a permanent-delete action per item and an "Empty Trash" action, both behind a confirmation — separate from the existing recoverable delete-with-undo flow, which still asks for nothing.
- Search results are grouped (Tasks / Projects / Sections) with the matching text highlighted; recent searches can be individually removed; clicking a result from the full-page Search view now actually works (it silently didn't before).
- Empty title now shows a visible error state (shake + red outline) instead of failing silently.
- A minimal Notifications setting ("remind me: off / daily / weekdays") was added, matching the brief's ask for one lightweight option.
- Subtle, `prefers-reduced-motion`-aware motion throughout: view-switch fade, panel/menu enter animation, checkbox completion pop, toast slide, sub-project row entrance.
- Keyboard-focus rings (`:focus-visible`) and a few `aria-*` additions (toast as a live region, pressed states on check/favorite buttons).

Not attempted here (each is a bigger, riskier change better done as its own pass): moving the task detail view from a modal to a persistent inspector panel, true native macOS SF Symbols/chrome, first-launch onboarding, and attachment handling.
