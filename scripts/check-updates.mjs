// Checks site/updates.json (the landing page ticker) before it's published. Any problem stops
// the publish, so the live page keeps its last good ticker, and the message says what to fix.
import { readFile } from 'node:fs/promises';

const COLOURS = ['gold', 'cyan', 'orange', 'crimson', 'blue', 'maroon'];
const MAX_TEXT = 120;
const problems = [];

let data;
try {
  data = JSON.parse(await readFile(new URL('../site/updates.json', import.meta.url), 'utf8'));
} catch (err) {
  problems.push(`updates.json isn't valid: ${err.message}. Check for a missing comma or quote mark, or a comma after the last item.`);
}

if (data) {
  if (!Array.isArray(data.items)) {
    problems.push('updates.json needs an "items" list: { "items": [ ... ] }.');
  } else {
    data.items.forEach((item, i) => {
      const n = `Item ${i + 1}`;
      if (!item || typeof item.text !== 'string' || !item.text.trim()) {
        problems.push(`${n} has no "text".`);
      } else if (item.text.length > MAX_TEXT) {
        problems.push(`${n} is ${item.text.length} characters; keep it under ${MAX_TEXT}.`);
      }
      if (item && item.colour !== undefined && !COLOURS.includes(String(item.colour).toLowerCase())) {
        problems.push(`${n} has colour "${item.colour}"; use one of: ${COLOURS.join(', ')}.`);
      }
      if (item && item.until !== undefined) {
        const ok = /^\d{4}-\d{2}-\d{2}$/.test(String(item.until)) && !isNaN(new Date(`${item.until}T00:00:00Z`).getTime());
        if (!ok) { problems.push(`${n} has "until": "${item.until}"; write the date as YYYY-MM-DD, e.g. 2026-12-12.`); }
      }
    });
  }
}

if (problems.length) {
  problems.forEach(p => console.log(`::error title=Ticker not published::${p}`));
  console.log('The live page still shows the previous ticker. Fix updates.json and save again.');
  process.exit(1);
}
console.log(`Ticker OK: ${data.items.length} item(s).`);
