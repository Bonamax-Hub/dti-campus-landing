// Builds site/updates.json (the landing page ticker) from the SharePoint "Landing Updates"
// list: Title, Colour (choice), ShowUntil (date, optional). Only admins can edit that list,
// so everything on the public ticker comes from them.
// Runs in GitHub Actions with an app that can only read the Digital Campus site
// (Microsoft Graph "Sites.Selected"). Without the app's details it does nothing, and if
// SharePoint can't be reached the last good updates.json is kept.
import { readFile, writeFile } from 'node:fs/promises';

const { M365_TENANT_ID: tenant, M365_CLIENT_ID: clientId, M365_CLIENT_SECRET: secret } = process.env;
const SITE = 'dtighana.sharepoint.com:/sites/DTI_DIGITAL_CAMPUS';
const OUT = new URL('../site/updates.json', import.meta.url);
const LIST = 'Landing Updates';
const MAX_ITEMS = 10;

if (!tenant || !clientId || !secret) {
  console.log('SharePoint app details not set yet; keeping updates.json as it is.');
  process.exit(0);
}

async function token() {
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default' })
  });
  if (!res.ok) { throw new Error(`Sign-in failed (${res.status}): ${await res.text()}`); }
  return (await res.json()).access_token;
}

async function graph(accessToken, path) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) { throw new Error(`Graph ${path} failed (${res.status}): ${await res.text()}`); }
  return res.json();
}

async function listItems(accessToken, siteId, name, fields) {
  const lists = await graph(accessToken, `/sites/${siteId}/lists?$select=id,displayName`);
  const list = lists.value.find(l => l.displayName.toLowerCase() === name.toLowerCase());
  // A missing or renamed list must not blank the ticker: keep the last good one.
  if (!list) { throw new Error(`No "${name}" list found on the site.`); }
  const items = [];
  let next = `/sites/${siteId}/lists/${list.id}/items?$top=200&$expand=fields($select=${fields.join(',')})`;
  while (next) {
    const page = await graph(accessToken, next);
    items.push(...page.value.map(i => i.fields));
    next = page['@odata.nextLink'] ? page['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : '';
  }
  return items;
}

const day = d => d.toISOString().slice(0, 10);
const COLOURS = ['gold', 'cyan', 'orange', 'crimson', 'blue', 'maroon'];

async function main() {
  const accessToken = await token();
  const site = await graph(accessToken, `/sites/${SITE}?$select=id`);
  const today = day(new Date());

  const items = (await listItems(accessToken, site.id, LIST, ['Title', 'Colour', 'ShowUntil']))
    .filter(f => f.Title && (!f.ShowUntil || day(new Date(f.ShowUntil)) >= today))
    .map(f => ({
      text: String(f.Title).trim(),
      colour: COLOURS.includes(String(f.Colour || '').toLowerCase()) ? String(f.Colour).toLowerCase() : 'gold',
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
