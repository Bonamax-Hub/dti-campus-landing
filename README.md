# DTI Digital Campus — landing page

The public front door to the DTI Digital Campus, published with GitHub Pages.

- `site/` is exactly what gets published: the page, its images and `updates.json` (the news ticker).
- `.github/workflows/publish.yml` publishes `site/` on every change, and every 15 minutes refreshes
  the ticker from SharePoint.
- `scripts/sync-updates.mjs` reads the ticker items from SharePoint (see below).
- `serve.js` previews the page locally: `node serve.js`, then open http://localhost:5173.

## Changing the ticker

**From SharePoint (once connected):** add, edit or delete rows in the **Landing Updates** list
(Title, Colour, Show until) on the Digital Campus site. Only the admins in the list's own
permissions can edit it, so everything on the public ticker comes from them. The ticker updates
within about 15 minutes, and items drop off by themselves after their "Show until" date. To feature
an event, add a row for it (e.g. "Graduation Ceremony — 12 December") with Show until set to that day.

**Until then:** edit `site/updates.json` on GitHub (pencil icon → Commit changes). Colours: gold,
cyan, orange, crimson, blue, maroon. `until` (YYYY-MM-DD) is optional.

## Connecting SharePoint

The workflow reads three repository secrets (Settings → Secrets and variables → Actions):
`M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET`, from an Entra app registration with the
Microsoft Graph application permission **Sites.Selected**, granted **read** on the Digital Campus
site only. Without them the workflow simply keeps `updates.json` as it is.
