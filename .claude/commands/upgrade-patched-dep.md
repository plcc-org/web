---
description: Upgrade a patched dependency, rebasing our local patches onto the new upstream version
argument-hint: '[package] [version, or omit for latest]'
---

Upgrade the patched dependency `$1`$2 in this repo.

**Fetch upstream changes to the package and rebase all local changes on top of upstream.
Check that the software works as intended, and only then replace the current version.**

`patches/README.md` is the record of why each patch exists. Read the entry for `$1` before
touching anything — the patches are described there by _intent_, because the diff itself is
against a bundled build whose line numbers mean nothing after a version bump.

Work in this order:

1. **Read the entry.** `patches/README.md`, plus the patch file itself for the current
   shape of each hunk. Note the "Delete it when" condition for each.

2. **Check whether upstream fixed it.** Look at the package's changelog and the relevant
   source between the pinned version and the target. For any hunk whose condition is now
   met, the patch goes away instead of forward — that is the best outcome, and it needs
   saying explicitly in the commit message.

3. **Install the new version.** The existing patch will fail to apply, loudly. That failure
   is expected and is the signal to re-derive; never force it or hand-edit the `.patch`
   file to make it apply.

4. **Re-apply each surviving hunk by intent.** Edit the installed package under
   `node_modules/` directly. The surrounding code will have moved and the APIs may have
   been renamed — confirm every editor/runtime API you call still exists in the new version
   rather than assuming, and re-check that the upstream bug is still present before
   reproducing a fix for it.

5. **Verify the behaviour.** Follow the "How to check it" steps in the `patches/README.md`
   entry. Run the real thing — for `tinacms` that means `npm run dev:tina` and driving the
   editor in a browser, not reasoning about the diff. A version bump does not land on the
   strength of "the patch applied cleanly". If a check cannot be run, say so plainly rather
   than reporting a pass.

6. **Regenerate the patch.** `rm patches/<old>.patch && npx patch-package $1`, then
   `npm ci` and confirm the patch applies to a clean tree. Delete the stale patch file.

7. **Keep the pin honest.** A package patched in a bundled build file is pinned to an exact
   version in `package.json` — update the pin, not just the lockfile. Update every version
   number in `patches/README.md`, `package.json`'s `_comment_postinstall`, and anywhere the
   docs name the version.

8. **Re-run the project checks** — `npm run format`, `npm run lint:css`, `npm run check`,
   `npm test`, `npm run build` — and update `docs/` if editor-visible behaviour changed.

If a hunk turns out to be unreproducible on the new version, stop and report that rather
than shipping a partial upgrade: half a patch is worse than none, because the missing half
is invisible.
