// Builds site/updates.json (the landing page ticker) from the SharePoint "Landing Updates"
// list: Title, Color (choice), ShowUntil (date, optional). Only admins can edit that list,
// so everything on the public ticker comes from them.
//
// Runs in GitHub Actions as the Entra app "DTI Landing Ticker", which can read that one list
// and nothing else (Microsoft Graph "Lists.SelectedOperations.Selected"). There is no secret:
// Entra trusts this repository's github-pages job through a federated credential, so the job
// signs in with GitHub's own short-lived token. Without the app's IDs it does nothing, and if
// SharePoint can't be reached the last good updates.json is kept.
import { readFile, writeFile } from 'node:fs/promises';

const { M365_TENANT_ID: tenant, M365_CLIENT_ID: clientId, ACTIONS_ID_TOKEN_REQUEST_URL: oidcUrl, ACTIONS_ID_TOKEN_REQUEST_TOKEN: oidcToken } = process.env;
/** The Digital Campus site and its Landing Updates list. */
const SITE_ID = 'dtighana.sharepoint.com,156edcc1-8234-460c-af79-11c32e7fbeb8,a768dbd3-cc50-47ce-b70c-c3908bb9800b';
const LIST_ID = 'cbe09185-4da7-42ea-95a2-ff3d8857b161';
const OUT = new URL('../site/updates.json', import.meta.url);
const MAX_ITEMS = 10;
const COLOURS = ['gold', 'cyan', 'orange', 'crimson', 'blue', 'maroon'];

if (!tenant || !clientId) {
  console.log('SharePoint app IDs not set yet; keeping updates.json as it is.');
  process.exit(0);
}

/** GitHub's signed statement that this is DTI's publish job, for Entra to check. */
async function githubToken() {
  if (!oidcUrl || !oidcToken) { throw new Error('No GitHub sign-in token: the job needs "id-token: write".'); }
  const res = await fetch(`${oidcUrl}&audience=${encodeURIComponent('api://AzureADTokenExchange')}`, { headers: { Authorization: `Bearer ${oidcToken}` } });
  if (!res.ok) { throw new Error(`GitHub token request failed (${res.status})`); }
  return (await res.json()).value;
}

async function graphToken() {
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: await githubToken()
    })
  });
  if (!res.ok) { throw new Error(`Microsoft sign-in failed (${res.status}): ${await res.text()}`); }
  return (await res.json()).access_token;
}

async function graph(accessToken, path) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) { throw new Error(`Graph ${path.split('?')[0]} failed (${res.status}): ${await res.text()}`); }
  return res.json();
}

async function listItems(accessToken) {
  const items = [];
  let next = `/sites/${SITE_ID}/lists/${LIST_ID}/items?$top=200&$expand=fields($select=Title,Color,ShowUntil)`;
  while (next) {
    const page = await graph(accessToken, next);
    items.push(...page.value.map(i => i.fields));
    next = page['@odata.nextLink'] ? page['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : '';
  }
  return items;
}

const day = d => d.toISOString().slice(0, 10);

async function main() {
  const today = day(new Date());
  const items = (await listItems(await graphToken()))
    .filter(f => f.Title && (!f.ShowUntil || day(new Date(f.ShowUntil)) >= today))
    .map(f => ({
      text: String(f.Title).trim(),
      colour: COLOURS.includes(String(f.Color || '').toLowerCase()) ? String(f.Color).toLowerCase() : 'gold',
      ...(f.ShowUntil ? { until: day(new Date(f.ShowUntil)) } : {})
    }))
    .slice(0, MAX_ITEMS);
  const next = JSON.stringify({ source: 'sharepoint', items }, null, 2) + '\n';
  const current = await readFile(OUT, 'utf8').catch(() => '');
  if (next === current) { console.log(`No change (${items.length} items).`); return; }
  await writeFile(OUT, next);
  console.log(`Updated ticker: ${items.length} items.`);
}

main().catch(err => {
  // Keep the last good ticker; show the problem in the run's summary.
  console.log(`::warning::Could not read SharePoint, kept the previous ticker. ${err.message}`);
});
