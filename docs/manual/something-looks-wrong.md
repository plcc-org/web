---
title: 'Something looks wrong'
description: 'What to do when the editor won’t save, a change doesn’t show up, or a page looks broken.'
section: help
order: 1
---

Find the symptom, then try the fix. If none of these fit, tell whoever looks after the
site’s code, and say what you saved and roughly when.

## The form won’t save

The form marks the field it’s unhappy with and says why. The usual reasons:

- **A Closing banner isn’t last, or there are two.** A page gets one, at the bottom. Drag it
  down, or delete the extra one.
- **A photo has no description.** It isn’t in **Photo descriptions** yet, so describe it in
  the field beside it. See [Add a photo](./add-a-photo.md).
- **A link isn’t one the site can open.** A link is a page here starting with `/` (like
  `/events/`), a full `https://` address, or `mailto:` and an email address. The message
  says which one it looks closest to. Most often it’s a missing `https://`.
- **A “Photo & text” top of page has no photo.** Add one, or choose another **Kind**.
- **No search summary and no intro line.** Every page needs one or the other; see
  [Add a page](./add-a-page.md).
- **A short link has a review date and “Never needs reviewing”.** Choose one.

## “Cannot navigate away from an invalid form”

The editor won’t open **Top of page** or a block while something on the page’s main form
needs fixing. Look for the field marked in red and fix it first.

## “TinaCMS Render Error”

The editor crashed. On a new page this happens when you open a block before the page has
been saved once; save first, then add blocks ([Add a page](./add-a-page.md)). Reloading
recovers the editor, but anything unsaved is lost.

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
see [Change some words](./change-some-words.md#inside-a-text-field).

## The editor says “GraphQL Schema Mismatch”

This isn’t something you did, and nothing you can fix from the editor. The editor and the
site disagree about what fields exist, usually after a change to the editor itself. Tell
whoever looks after the site’s code; your saved work is safe.

## What’s On is missing an event

See [Get an event on What’s On](./get-an-event-on-whats-on.md#if-something-goes-wrong).
