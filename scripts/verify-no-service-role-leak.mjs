#!/usr/bin/env node
// Verifies that SUPABASE_SERVICE_ROLE_KEY does not leak into the Next.js
// client bundle. Run after `next build` (or as a CI gate).

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const STATIC_DIR = '.next/static';

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (entry.endsWith('.js')) {
      yield full;
    }
  }
}

function main() {
  if (!existsSync(STATIC_DIR)) {
    console.error(`Missing ${STATIC_DIR}. Run \`next build\` first.`);
    process.exit(2);
  }

  const literalNeedle = 'SUPABASE_SERVICE_ROLE_KEY';
  const valueNeedle = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

  const offenders = [];
  for (const file of walk(STATIC_DIR)) {
    const text = readFileSync(file, 'utf8');
    if (text.includes(literalNeedle)) offenders.push({ file, kind: 'literal' });
    if (valueNeedle && valueNeedle.length >= 20 && text.includes(valueNeedle)) {
      offenders.push({ file, kind: 'value' });
    }
  }

  if (offenders.length === 0) {
    console.log('OK — service-role key not present in client bundle.');
    process.exit(0);
  }

  console.error('LEAK DETECTED — service-role key present in client bundle:');
  for (const o of offenders) console.error(`  [${o.kind}] ${o.file}`);
  process.exit(1);
}

main();
