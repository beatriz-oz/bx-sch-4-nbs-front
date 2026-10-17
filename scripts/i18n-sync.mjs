// Keeps src/locale/messages.pt-PT.xlf in step with messages.xlf (the source):
// new texts are added (without a <target>: add one with the translation), texts removed from
// the HTML are dropped, and existing translations are kept.
// Usage: npm run i18n:extract && npm run i18n:sync
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SOURCE = 'src/locale/messages.xlf';
const TARGET = 'src/locale/messages.pt-PT.xlf';
const LOCALE = 'pt-PT';

const unitPattern = /<trans-unit id="([^"]+)"[^>]*>([\s\S]*?)<\/trans-unit>/g;

function units(xml) {
  const found = new Map();
  for (const [, id, body] of xml.matchAll(unitPattern)) {
    const source = body.match(/<source>([\s\S]*?)<\/source>/)?.[1] ?? '';
    const target = body.match(/<target>([\s\S]*?)<\/target>/)?.[1];
    found.set(id, { source, target });
  }
  return found;
}

const source = units(readFileSync(SOURCE, 'utf8'));
const existing = existsSync(TARGET) ? units(readFileSync(TARGET, 'utf8')) : new Map();

const missing = [];
const body = [...source]
  .map(([id, { source: text }]) => {
    const target = existing.get(id)?.target ?? '';
    const lines = [`      <trans-unit id="${id}" datatype="html">`, `        <source>${text}</source>`];
    // No <target> at all when untranslated: an empty one would show an empty text.
    if (target.trim()) {
      lines.push(`        <target>${target}</target>`);
    } else {
      missing.push(id);
    }
    lines.push(`      </trans-unit>`);
    return lines.join('\n');
  })
  .join('\n');

writeFileSync(
  TARGET,
  `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="${LOCALE}" datatype="plaintext" original="ng2.template">
    <body>
${body}
    </body>
  </file>
</xliff>
`,
);

const removed = [...existing.keys()].filter((id) => !source.has(id));
console.log(`${TARGET}: ${source.size} texts, ${missing.length} to translate, ${removed.length} removed.`);
for (const id of missing) console.log(`  to translate: ${id}`);
