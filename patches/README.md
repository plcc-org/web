# Patched dependencies

Two dependencies are patched in place. `patch-package` re-applies them on `postinstall`, so
a fresh clone and CI get them without anyone remembering to.

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

**File:** `@tinacms+cli+3.1.0.patch`

**Upstream behaviour.** `tinacms build` compiles the 11 MB admin single-page app
unconditionally.

**Why that's wrong here.** Only a build that deploys needs the admin. Cloudflare's does:
it sets `TINA_PUBLISH_ADMIN=true` and serves `/admin` from the result. GitHub CI builds both
deploy targets purely to verify them and discards the output, so there the compile is 60
seconds per build, twice per run, producing a directory nothing serves.

**What the patch does.** Makes that compile conditional on `TINA_PUBLISH_ADMIN=true`.
`tinacms dev` is untouched: it serves the admin from Vite, not from this bundle, so local
editing is unaffected.

**How to check it.** `npm run build` finishes without an `/admin` compile step, and
`npm run dev:tina` still serves the editor at `/admin/index.html`.

**Delete it when.** The CLI grows a flag of its own for this, or the compile stops being
worth skipping. Upstream is moving to a prebuilt admin shell that would cut the per-project
step to milliseconds: <https://github.com/tinacms/tinacms/issues/7237>. There was no flag as
of 3.1.0.

---

## `tinacms` — don't mutate a block template's `defaultItem` when adding a block

**File:** `tinacms+3.14.1.patch`

**Upstream behaviour.** Adding a block to a `blocks` list (`Blocks`'s `addItem` in
`dist/index.js`) takes the template's `defaultItem` object itself, writes `_template` onto
it, and pushes that same object into the form:
`obj = template.defaultItem || {}; obj._template = name;`.

**Why that's wrong here.** Writing to `defaultItem` changes the schema. On a page that has
never been saved, Tina's "Create New" screen re-registers its form whenever
`JSON.stringify(formInfo.fields)` changes, and the re-registered form starts from the
collection's initial values, with no blocks. The blocks still show in the list, but the
form behind them has none, so opening one does nothing on the first click and crashes the
editor on the second ("TinaCMS Render Error: undefined is not an object (evaluating
'value[index2]')", in `getFieldGroup`). Every template with a `ui.defaultItem` was affected
on a new page: Split, CardRow, Quote, FeaturedEvents, KeyPoints, QuoteCarousel. Saved pages
were fine, since their form isn't re-registered. Two blocks of the same kind also shared
one object.

**What the patch does.** Copies the object instead: `obj = { ...template.defaultItem || {} }`.
The function form of `defaultItem` already returned a fresh object and is untouched.

**How to check it.** In `npm run dev:tina`, open Pages → Add File, give it a title, add a
Quote (or two Photo beside text blocks) without saving, and open each block: it opens on
the first click, and each keeps its own heading after you go back. Unpatched, the second
click crashes. After a build with `TINA_PUBLISH_ADMIN=true`, the admin bundle in
`dist/client/admin/assets/` contains `{...<x>.defaultItem||{}}`.

**Delete it when.** Upstream copies the default item in `Blocks`'s `addItem` (or the Create
New form stops re-registering on a schema change). Still present in 3.14.1.
