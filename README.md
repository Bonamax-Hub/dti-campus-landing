# DTI Digital Campus — landing page

The public front door to the DTI Digital Campus, published with GitHub Pages:
https://dtiafrica.github.io/dti-campus-landing/ (soon https://campus.dtiafrica.edu.gh).

- `site/` is exactly what gets published: the page, its images and `updates.json` (the news ticker).
- `.github/workflows/publish.yml` publishes `site/` on every change, and every 15 minutes refreshes
  the ticker from SharePoint.
- `scripts/sync-updates.mjs` reads the ticker from SharePoint; `scripts/check-updates.mjs` checks it
  before publishing.
- `serve.js` previews the page locally: `node serve.js`, then open http://localhost:5173.

## Changing the ticker

Edit the **Landing Updates** list on the Digital Campus site (SharePoint or the Microsoft Lists app).
Only the admins in the list's own permissions can edit it.

- **Title:** the message, under 120 characters. Only confirmed information: this page is public.
- **Color:** the dot before the message.
- **Show until** (optional): the last day to show it. It disappears by itself after that.

Changes appear within about 15 minutes. To feature an event, add a row for it (e.g. "Graduation
Ceremony — 12 December") with Show until set to that day. With no current rows, the ticker hides.
Every change the job publishes is saved as a commit, so there's a record of what was public when.

If SharePoint can't be reached, or a row would break the page, the live page keeps its previous
ticker and the run shows a warning.

## How the connection works

The job signs in to Microsoft 365 as the Entra app **DTI Landing Ticker**:

- Microsoft Graph application permission **Lists.SelectedOperations.Selected**, granted **read**
  on the Landing Updates list only. It can't see anything else in the tenant.
- No secret: a **federated credential** on the app trusts this repository's `github-pages`
  environment (`repo:dtiafrica/dti-campus-landing:environment:github-pages`), so the job signs in
  with GitHub's own short-lived token.
- Repository **variables** (Settings → Secrets and variables → Actions → Variables):
  `M365_TENANT_ID` and `M365_CLIENT_ID`. They're identifiers, not secrets.

Renaming the repository, the organisation or the `github-pages` environment breaks the trust;
update the federated credential to match.
