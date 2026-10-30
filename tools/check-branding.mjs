import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Built from fragments so this guard never matches itself.
const forbidden = new RegExp(['bri', 'nk'].join(''), 'i');
const skippedDirectories = new Set(['node_modules', 'dist', '.git', '.vite', 'coverage']);
const textFile = /\.(?:md|mjs|js|cjs|ts|tsx|json|yml|yaml|html|css|tmdl|bim|pbism|sql|ps1|txt|platform)$/i;
const maxBytes = 5 * 1024 * 1024;

function decodedPayloads(value, location, found = []) {
  if (Array.isArray(value)) value.forEach((item, index) => decodedPayloads(item, `${location}[${index}]`, found));
  else if (value && typeof value === 'object') {
    if (typeof value.payload === 'string' && value.payloadType === 'InlineBase64') {
      found.push({ location: `${location}${value.path ? `:${value.path}` : ''}`, text: Buffer.from(value.payload, 'base64').toString('utf8') });
    }
    for (const [key, child] of Object.entries(value)) decodedPayloads(child, `${location}.${key}`, found);
  }
  return found;
}

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) yield* walk(path.join(directory, entry.name));
    } else if (entry.isFile() && (textFile.test(entry.name) || entry.name === '.platform')) {
      yield path.join(directory, entry.name);
    }
  }
}

export async function findCustomerReferences(root = fileURLToPath(new URL('..', import.meta.url))) {
  const findings = [];
  for await (const file of walk(root)) {
    const text = await readFile(file, 'utf8').catch(() => '');
    if (!text || text.length > maxBytes) continue;
    const relative = path.relative(root, file);
    if (forbidden.test(text)) findings.push({ file: relative, kind: 'text' });
    if (file.endsWith('.json')) {
      try {
        for (const payload of decodedPayloads(JSON.parse(text), '$')) {
          if (forbidden.test(payload.text)) findings.push({ file: relative, kind: 'decoded-definition-payload', location: payload.location });
        }
      } catch { /* not JSON; plain-text check above is sufficient */ }
    }
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = await findCustomerReferences();
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), remaining: findings.length, findings }, null, 2));
  process.exitCode = findings.length ? 1 : 0;
}
