# Patched dependencies

Two dependencies are patched in place. `patch-package` re-applies both on `postinstall`,
so a fresh clone and CI get them without anyone remembering to.

**A patch is a fork you have to carry.** Each one below records what upstream does, why
that is wrong here, what the patch changes, how to check it still works, and the condition
under which it can be deleted. Write that down for any new patch too — a patch whose
motivation is lost gets carried forever or dropped by accident, and both are worse than
the bug it fixed.

## Upgrading a patched dependency

Patches are pinned to a version — the filename says which. Bumping the version does **not**
carry the patch forward; `patch-package` will refuse to apply a patch whose context has
moved, and the fix silently reverts.

The procedure, whether run by hand or by an agent:

> Fetch upstream changes to `<package>` and rebase all local changes on top of upstream.
> Check that the software works as intended, and replace the current version.

Concretely:

1. Read this file's entry for the package. It tells you what each hunk is for.
2. `npm install <package>@<new-version>` — the old patch will fail to apply. That failure
   is expected, and is the signal to re-derive the change rather than force it.
3. Check whether upstream fixed it. If the behaviour this patch corrects is now correct
   without us, delete the patch and this entry, and say so in the commit.
4. Otherwise re-apply each hunk **by intent, not by diff** — the surrounding code will have
   moved, and the old line numbers mean nothing. The entries below describe the intent.
5. Verify against the "How to check it" steps for the package.
6. `rm patches/<old>.patch && npx patch-package <package>` to regenerate, then
   `npm ci` and confirm the patch applies to a clean tree.
7. Commit the new patch, the version bump, and any edit this file needed.

An agent running this should treat step 5 as the gate: no version bump lands without the
behaviour being demonstrated, not assumed.

---

## `@tinacms/cli` — don't compile the admin SPA on every build

**File:** `@tinacms+cli+2.5.6.patch`

**Upstream behaviour.** `tinacms build` compiles the 11 MB admin single-page app
unconditionally.

**Why that's wrong here.** This site deploys as static files with no data layer behind
them, so a deployed admin has nothing to talk to — `scripts/prune-admin.mjs` deletes it
again immediately after. That is 60 seconds of every CI run and every Cloudflare build
spent producing a directory the next step removes.

**What the patch does.** Makes that compile conditional on `TINA_PUBLISH_ADMIN=true`.
`tinacms dev` is untouched: it serves the admin from Vite, not from this bundle, so local
editing is unaffected.

**How to check it.** `npm run build` finishes without an `/admin` compile step, and
`npm run dev:tina` still serves the editor at `/admin/index.html`.

**Delete it when.** The CLI grows a flag of its own for this. There was no equivalent as of
2.5.6.

---

## `tinacms` — block editing in the page body

**File:** `tinacms+3.11.0.patch`

The page body is a `rich-text` field whose real content is a sequence of block templates
(see `tina/templates.mjs`). Every one of those blocks is a Slate **void** node, and the
stock editor handles voids badly enough that inserting a block could destroy another one.
Three hunks, all in `dist/index.js`.

`tinacms` is pinned to an exact version in `package.json` for this reason: the patch lands
in a rollup bundle whose contents shift on every release.

### 1. Inserting a block no longer overwrites the selected one

**Upstream behaviour.** `insertBlockElement` asks `isCurrentBlockEmpty()` and, if the
answer is yes, calls `setNodes` — replacing the current block in place instead of adding
one.

**Why that's wrong here.** `isCurrentBlockEmpty` tests "no text, no inline children, cursor
at offset 0". A void node satisfies all three by construction, so it is _always_ "empty".
Select a `Photo & text (split)` block, insert a `Quote`, and the Split becomes a Quote —
the content is gone, with no warning and nothing to undo it but Ctrl-Z.

**What the patch does.** Checks `editor.api.isVoid()` first and inserts _after_ the
selected block. Separately, when there is no selection at all — the state the editor is in
before it has been clicked into — the stock code returns early and the insert silently does
nothing; the patch appends to the end of the document instead.

### 2. Blocks can be reordered, duplicated, and separated

**Upstream behaviour.** The `…` menu on a block offers exactly **Edit** and **Remove**.
There is no move, no duplicate, no drag handle, and no way to open a gap between two
adjacent blocks.

**Why that's wrong here.** A page body here is almost entirely blocks — reordering them is
ordinary editing, not an edge case. Without it the only way to move a section is to delete
it and rebuild it from scratch, or to hand-edit the MDX.

**What the patch does.** `useEmbedHandles` gains `handleMoveUp`, `handleMoveDown`,
`handleDuplicate` and `handleInsertBelow` plus `canMoveUp` / `canMoveDown` bounds, and
`DotMenu` renders them as **Move up**, **Move down**, **Duplicate** and **Insert blank line
below** between Edit and Remove. Move is greyed out at the ends of the list. The handlers
are optional props, so the inline-embed menu is unchanged.

### 3. Wiring

`BlockEmbed` passes the new handlers to `DotMenu`. Nothing else changes.

**How to check it.** `npm run dev:tina`, open
`http://localhost:4321/admin/index.html#/collections/edit/pages/families`, and on the Body
field:

- The `…` menu on a block lists Edit / Move up / Move down / Duplicate / Insert blank line
  below / Remove, with Move up greyed out on the first block.
- Move up and Move down reorder blocks; Duplicate copies one in place; Insert blank line
  below opens an empty paragraph under it.
- Click a block to select it, then insert a template from the **Embed** menu: the new block
  lands _after_ the selected one and the selected one still exists.

Don't save while testing — reload to discard.

**Delete it when.** Upstream fixes void-node insertion and ships block-level reordering in
the rich-text editor. Neither existed as of 3.11.0, and the void bug is worth reporting: it
is a data-loss bug for any Tina site whose body is built from templates.

**Related, and deliberately not patched.** The slash (`/`) menu offers only headings and
lists — templates aren't in it. That is an inconvenience, not a hazard, and it would mean
patching the combobox as well.
