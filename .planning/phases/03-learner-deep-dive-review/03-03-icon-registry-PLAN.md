---
phase: 03
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/icons.tsx
requirements: []
autonomous: true
tags: [infra, icons, registry]

must_haves:
  truths:
    - "All icon names referenced by Phase 3 UI-SPEC resolve to a real export on the Icons object"
    - "No Phase 3 component file needs to import from '@tabler/icons-react' directly (CLAUDE.md rule)"
  artifacts:
    - path: "src/components/icons.tsx"
      provides: "Extended Icons registry with mic, sparkle (alias), messageSquare (alias), fileX, undo entries"
      contains: "Icons.mic"
  key_links:
    - from: "src/components/icons.tsx Icons object"
      to: "@tabler/icons-react named imports"
      via: "key: TablerComponent mapping at the bottom of the file"
      pattern: "mic: IconMicrophone"
---

<objective>
Add the icon names referenced by 03-UI-SPEC.md and 03-PATTERNS.md but missing from the current `src/components/icons.tsx` registry. This is a small infrastructure plan that runs in Wave 1 so Plans 04-06 (which run in Wave 2) can `import { Icons } from '@/components/icons'` without touching the registry.

Purpose: Per CLAUDE.md project rule, components must NEVER `import { ... } from '@tabler/icons-react'` directly. The registry must export every icon those components need.

Output: Modifications to a single file (`src/components/icons.tsx`) — one new tabler import per missing icon plus one new entry per missing key on the `Icons` object.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-learner-deep-dive-review/03-UI-SPEC.md
@.planning/phases/03-learner-deep-dive-review/03-PATTERNS.md
@src/components/icons.tsx
@CLAUDE.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Extend Icons registry with mic, sparkle, messageSquare, fileX, undo</name>

  <read_first>
    - src/components/icons.tsx (full file 219 lines — current registry; see existing pattern at lines 96-218 for how keys map to Tabler imports)
    - .planning/phases/03-learner-deep-dive-review/03-UI-SPEC.md (lines 142-143: Icons referenced; "Available icon name mismatches" details)
    - .planning/phases/03-learner-deep-dive-review/03-PATTERNS.md (§ "Icon Imports (CLAUDE.md Rule)" — lines 1190-1198 — definitive mismatch table)
  </read_first>

  <files>src/components/icons.tsx</files>

  <action>
The current `Icons` registry is in `src/components/icons.tsx` lines 1-219. Per PATTERNS.md §Icon Imports lines 1190-1198, these names are needed by Phase 3 but missing from the registry:

| UI-SPEC name | Status today | Action |
|--------------|-------------|--------|
| `Icons.loader` | already aliased to `Icons.spinner` (line 112: `spinner: IconLoader2`) | Plans 04-06 will use `Icons.spinner` directly — NO change needed |
| `Icons.clipboardList` | already exists as `Icons.forms` (line 212: `forms: IconClipboardText`) | Plans 04-06 will use `Icons.forms` directly — NO change needed |
| `Icons.sparkle` | exists as `Icons.sparkles` (line 193: `sparkles: IconSparkles`) | ADD alias `sparkle: IconSparkles` so consumer code matches UI-SPEC verbatim |
| `Icons.messageSquare` | exists as `Icons.chat` (line 147: `chat: IconMessage`) | ADD alias `messageSquare: IconMessage` so consumer code matches UI-SPEC verbatim |
| `Icons.mic` | MISSING | ADD `mic: IconMicrophone` (new tabler import) |
| `Icons.fileX` | MISSING | ADD `fileX: IconFileX` (new tabler import; used by 404 "submission not found" empty state per UI-SPEC §Error states) |
| `Icons.undo` | MISSING | ADD `undo: IconArrowBackUp` (new tabler import; semantically correct for "Undo" action per UI-SPEC §Surface 4) |

**Implementation steps:**

1. **Add three new named imports** to the alphabetically-sorted import block at the top of the file (lines 1-92). Maintain alphabetical order:
   - `IconArrowBackUp` (insert near `IconArrowRight` on line 5)
   - `IconFileX` (insert with the other File* imports around lines 37-42)
   - `IconMicrophone` (insert before `IconMinus` on line 56)

   Resulting partial import block (showing context only — preserve the rest of the imports verbatim):
   ```typescript
   import {
     IconAdjustmentsHorizontal,
     IconAlertCircle,
     IconAlertTriangle,
     IconArrowBackUp,    // NEW
     IconArrowRight,
     IconBell,
     // ...
     IconFile,
     IconFileText,
     IconFileTypePdf,
     IconFileTypeDoc,
     IconFileTypeXls,
     IconFileX,          // NEW
     IconFileZip,
     // ...
     IconMessage,
     IconMicrophone,     // NEW
     IconMinus,
     // ...
   ```

2. **Add five new entries** to the `Icons` object literal (lines 96-218). Group sensibly with neighboring keys (NOT strictly alphabetical — the file groups by section comments like `// Communication`, `// Files`):

   - `mic: IconMicrophone` — add inside the `// Communication` group (near `chat`, `phone`, `video`, `send`)
   - `messageSquare: IconMessage` — add as an alias inside the `// Communication` group, right after `chat: IconMessage`
   - `fileX: IconFileX` — add inside the `// Files` group, near `page` / `post`
   - `sparkle: IconSparkles` — add as an alias inside the `// Commerce / Plans` group, right after `sparkles: IconSparkles`
   - `undo: IconArrowBackUp` — add inside the `// Actions` group (near `add`, `edit`, `upload`)

   Example for the `// Communication` group after the change:
   ```typescript
     // Communication
     chat: IconMessage,
     messageSquare: IconMessage,   // NEW — UI-SPEC alias
     mic: IconMicrophone,          // NEW
     notification: IconBell,
     phone: IconPhone,
     video: IconVideo,
     send: IconSend,
     paperclip: IconPaperclip,
   ```

**Code style (CLAUDE.md LOCKED):** single quotes, no trailing comma at the end of object literals (the existing file follows this — be careful when adding the LAST key in a section that you do not introduce a trailing comma; existing pattern places the new key BEFORE another existing key so the comma after the new line is required).

Verify after edits: the final `Icons` object literal should still have NO trailing comma after the last key (`school: IconSchool` on line 217 stays last with no trailing comma).

**DO NOT:**
- Modify any existing key/value pair (only ADD new ones).
- Reorder existing entries.
- Remove the section comments (`// General`, `// Communication`, etc.).
- Add icons not on the list above.
- Use a non-tabler source for any icon (project rule: all icons sourced from `@tabler/icons-react`, wrapped via the `Icons` registry).
  </action>

  <verify>
    <automated>grep -n "mic: IconMicrophone" src/components/icons.tsx && grep -n "fileX: IconFileX" src/components/icons.tsx && grep -n "undo: IconArrowBackUp" src/components/icons.tsx && grep -n "sparkle: IconSparkles" src/components/icons.tsx && grep -n "messageSquare: IconMessage" src/components/icons.tsx && grep -n "IconMicrophone" src/components/icons.tsx && grep -n "IconFileX" src/components/icons.tsx && grep -n "IconArrowBackUp" src/components/icons.tsx && npx tsc --noEmit && npm run build</automated>
  </verify>

  <acceptance_criteria>
    - `src/components/icons.tsx` contains `IconArrowBackUp` in the import block
    - `src/components/icons.tsx` contains `IconFileX` in the import block
    - `src/components/icons.tsx` contains `IconMicrophone` in the import block
    - `src/components/icons.tsx` contains `mic: IconMicrophone` on the Icons object
    - `src/components/icons.tsx` contains `messageSquare: IconMessage` on the Icons object
    - `src/components/icons.tsx` contains `fileX: IconFileX` on the Icons object
    - `src/components/icons.tsx` contains `sparkle: IconSparkles` on the Icons object
    - `src/components/icons.tsx` contains `undo: IconArrowBackUp` on the Icons object
    - The pre-existing entries `spinner: IconLoader2`, `forms: IconClipboardText`, `chat: IconMessage`, `sparkles: IconSparkles`, `arrowRight: IconArrowRight` are still present (no regressions)
    - `npx tsc --noEmit` exits with code 0
    - `npm run build` exits with code 0
  </acceptance_criteria>

  <done>
    The Icons registry resolves every name referenced by Phase 3 UI-SPEC. Plans 04-06 can write `<Icons.mic />`, `<Icons.fileX />`, `<Icons.undo />`, `<Icons.sparkle />`, `<Icons.messageSquare />` without modifying this file or importing from `@tabler/icons-react` directly.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none — pure UI registry change) | No external input, no auth, no data mutation |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-16 | Tampering | malicious icon source | mitigate | Icons sourced exclusively from `@tabler/icons-react` (already a project dependency at v3.40.0). No new dependencies introduced. |
| T-03-17 | Information Disclosure | n/a | accept | Pure presentation layer; no data flow |
</threat_model>

<verification>
- `npx tsc --noEmit` → exit 0
- `npm run build` → exit 0
- Quick visual check: `grep -c "IconMicrophone\\|IconFileX\\|IconArrowBackUp" src/components/icons.tsx` should return 6 (3 in imports, 3 in object literal — once each)
</verification>

<success_criteria>
All five missing icon names resolve via the registry. Plans 04-06 can write Phase 3 components without touching this file or `@tabler/icons-react` directly. No build or type errors.
</success_criteria>

<output>
After completion, create `.planning/phases/03-learner-deep-dive-review/03-03-SUMMARY.md` documenting:
- Which icons were added (mic, fileX, undo, sparkle alias, messageSquare alias)
- Confirmation that pre-existing aliases (spinner = loader, forms = clipboardList) cover the rest of UI-SPEC's icon needs
- Quick reference table for Plans 04-06 mapping UI-SPEC name → registry key
</output>
