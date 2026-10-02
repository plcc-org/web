---
title: 'Something looks wrong'
description: 'What to do when the editor won’t save, a change doesn’t show up, or a page looks broken.'
section: help
order: 1
---

Find the symptom, then try the fix. If none of these fit, tell whoever looks after the
site’s code, and say what you saved and roughly when.

## Not saved yet

Pressing **Save** on a page checks everything on it first. If something needs fixing, the
save is refused with a message starting “Not saved yet”, naming where: “Top of page: …” or
“Block 3 (Closing banner): …”. Open that block, fix what it says, and save again. The usual
reasons:

- **A photo has no description.** It isn’t in **Photo descriptions** yet, so describe it in
  the field beside it. See [Add a photo](./add-a-photo.md).
- **A link isn’t one the site can open.** A link is a page here starting with `/` (like
  `/events/`), a full `https://` address, or `mailto:` and an email address. The message
  says which one it looks closest to. Most often it’s a missing `https://`.
- **A “Photo & text” top of page has no photo.** Add one, or choose another **Kind**.
- **A block is missing something it needs,** like a heading or a photo.

## The form won’t save

The form itself marks the field it’s unhappy with:

- **A Closing banner isn’t last, or there are two.** A page gets one, at the bottom. Drag it
  down, or delete the extra one.
- **No search summary and no intro line,** on a page you’re publishing. Every published
  page needs one or the other; see [Add a page](./add-a-page.md).
- **A short link has a review date and “Never needs reviewing”.** Choose one.

## “Cannot navigate away from an invalid form”

The editor won’t open **Top of page** or a block while something on the page’s main form
needs fixing. Look for the field marked in red and fix it first.

## “TinaCMS Render Error”

The editor crashed. Reload the page to recover it; anything you hadn’t saved is lost. Tell
whoever looks after the site’s code what you were doing when it happened.

## My change isn’t showing

- **Give it a few minutes.** Every save rebuilds the site, and the change goes live when
  that finishes. Only one rebuild runs at a time, so if several people have saved, yours
  waits its turn.
- **Is the page still a draft?** If **Hidden from the public site (draft)** is ticked, it’s
  visible only in the editor.
- **Is your browser showing an old copy?** Reload the page.
- **Still nothing after half an hour?** The site may have stopped updating. That can happen
  when two Sunday links entries share a date, or a short link is named after a page (see
  [Add a short link](./add-a-short-link.md)); otherwise tell whoever looks after the site’s
  code.

## A photo is blank

In the editor’s preview, a photo you’ve just uploaded stays blank until the site has
rebuilt. It’s saved, and it will appear on the page.

## A link goes nowhere

If a link in some text goes to `#` when you click it, its address wasn’t one the site
allows. Open the text, select the link, and give it a page here starting with `/`, a full
`https://` address, `mailto:` with an email address, or `tel:` with a phone number.

## Quotes look straight

In a **Text** field, a straight `'` stays straight on the page. Type the curly one instead;
see [Change some content](./change-some-words.md#inside-a-text-field).

## The editor says “GraphQL Schema Mismatch”

This isn’t something you did, and nothing you can fix from the editor. The editor and the
site disagree about what fields exist, usually after a change to the editor itself. Tell
whoever looks after the site’s code; your saved work is safe.

## What’s On is missing an event

See [Get an event on What’s On](./get-an-event-on-whats-on.md#if-something-goes-wrong).
