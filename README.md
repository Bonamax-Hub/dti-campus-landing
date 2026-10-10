# DTI Digital Campus — landing page

The public front door to the DTI Digital Campus, published with GitHub Pages:
https://dtiafrica.github.io/dti-campus-landing/ (soon https://campus.dtiafrica.edu.gh).

- `site/` is exactly what gets published: the page, its images and `updates.json` (the news ticker).
- `.github/workflows/publish.yml` checks the ticker and publishes `site/` on every change.
- `serve.js` previews the page locally: `node serve.js`, then open http://localhost:5173.

## Changing the ticker

Only members of the **dtiafrica** GitHub organisation with write access to this repository can
change it.

1. Open [`site/updates.json`](site/updates.json) and click the **pencil** (Edit this file).
2. Each line in `items` is one message:

   ```json
   { "text": "Graduation Ceremony — 12 December, Main Auditorium", "colour": "crimson", "until": "2026-12-12" },
   ```

   - `text`: the message, under 120 characters. Only post confirmed information: this page is public.
   - `colour`: gold, cyan, orange, crimson, blue or maroon (the dot before the message).
   - `until` (optional): the last day to show it, as YYYY-MM-DD. It disappears by itself after that.
   - Every line ends with a comma **except the last one**.
3. **Commit changes…** → **Commit changes**. It's live in about a minute.

If the file has a mistake (a missing comma, an unknown colour, a date in the wrong format), the
publish stops, **the live page keeps its previous ticker**, and GitHub emails you the reason. Fix it
and save again. With no current items, the ticker hides itself.

## Connecting SharePoint later (optional)

`scripts/sync-updates.mjs` can fill `updates.json` from an admin-only SharePoint list
("Landing Updates": Title, Color, ShowUntil) instead. It needs a free Entra app registration with the
Microsoft Graph permission **Sites.Selected**, granted read on the Digital Campus site only, and a
scheduled workflow step that runs it with the app's details as repository secrets.
