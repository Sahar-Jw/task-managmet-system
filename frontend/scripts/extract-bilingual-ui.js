const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const enPath = path.join(sourceRoot, 'i18n/messages/en.json');
const arPath = path.join(sourceRoot, 'i18n/messages/ar.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
en.generatedUi ||= {};
ar.generatedUi ||= {};

const pairs = new Map();
for (const [key, value] of Object.entries(en.generatedUi)) {
  pairs.set(`${value}\u0000${ar.generatedUi[key]}`, key);
}
let sequence = Object.keys(en.generatedUi).reduce((max, key) => {
  const value = Number(key.replace(/^text/, ''));
  return Number.isFinite(value) ? Math.max(max, value) : max;
}, 0);

function keyFor(english, arabic) {
  const pair = `${english}\u0000${arabic}`;
  if (pairs.has(pair)) return pairs.get(pair);
  const key = `text${String(++sequence).padStart(4, '0')}`;
  pairs.set(pair, key);
  en.generatedUi[key] = english;
  ar.generatedUi[key] = arabic;
  return key;
}

function decodeLiteral(quote, raw) {
  if (quote === '`') return raw.replace(/\\`/g, '`');
  try { return JSON.parse(`${quote}${raw}${quote}`); } catch { return raw; }
}

function visit(dir, files = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(full, files);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function scanTemplate(source, start) {
  if (source[start] !== '`') return null;
  let index = start + 1;
  let text = '';
  const expressions = [];
  while (index < source.length) {
    if (source[index] === '\\') {
      text += source.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (source[index] === '`') return {end: index + 1, text, expressions};
    if (source[index] !== '$' || source[index + 1] !== '{') {
      text += source[index++];
      continue;
    }
    const expressionStart = index + 2;
    index = expressionStart;
    let depth = 1;
    let quote = null;
    while (index < source.length && depth) {
      const char = source[index];
      if (quote) {
        if (char === '\\') index += 2;
        else if (char === quote) { quote = null; index++; }
        else index++;
        continue;
      }
      if (char === "'" || char === '"' || char === '`') { quote = char; index++; continue; }
      if (char === '{') depth++;
      else if (char === '}') depth--;
      index++;
    }
    if (depth) return null;
    expressions.push(source.slice(expressionStart, index - 1).trim());
    text += `{value${expressions.length - 1}}`;
  }
  return null;
}

function extractTemplateTernaries(source) {
  const conditionPattern = /(isArabic|isAr|locale\s*===\s*['"]ar['"])\s*\?\s*`/g;
  const edits = [];
  for (let match; (match = conditionPattern.exec(source));) {
    const firstStart = conditionPattern.lastIndex - 1;
    const first = scanTemplate(source, firstStart);
    if (!first) continue;
    let colon = first.end;
    while (/\s/.test(source[colon])) colon++;
    if (source[colon] !== ':') continue;
    let secondStart = colon + 1;
    while (/\s/.test(source[secondStart])) secondStart++;
    const second = scanTemplate(source, secondStart);
    if (!second) continue;
    if (!/[\u0600-\u06ff]/.test(first.text) || /[\u0600-\u06ff]/.test(second.text)) continue;
    if (first.expressions.length !== second.expressions.length) continue;
    if (first.expressions.some((expression, i) => expression.replace(/\s+/g, '') !== second.expressions[i].replace(/\s+/g, ''))) continue;
    const key = keyFor(second.text, first.text);
    const values = first.expressions.length
      ? `, { ${first.expressions.map((expression, i) => `value${i}: ${expression}`).join(', ')} }`
      : '';
    edits.push({start: match.index, end: second.end, replacement: `uiText(${match[1].replace(/\s+/g, ' ')}, '${key}'${values})`});
  }
  for (const edit of edits.reverse()) source = source.slice(0, edit.start) + edit.replacement + source.slice(edit.end);
  replacements += edits.length;
  return source;
}

const condition = String.raw`(isArabic|isAr|locale\s*===\s*['"]ar['"])`;
const pattern = new RegExp(
  `${condition}\\s*\\?\\s*(['"\\x60])([^\\r\\n]*?)\\2\\s*:\\s*(['"\\x60])([^\\r\\n]*?)\\4`,
  'g',
);

let changedFiles = 0;
let replacements = 0;
for (const file of visit(sourceRoot)) {
  if (file.includes(`${path.sep}i18n${path.sep}messages${path.sep}`)) continue;
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  source = source.replace(pattern, (whole, predicate, arQuote, arRaw, enQuote, enRaw) => {
    if ((arQuote === '`' && arRaw.includes('${')) || (enQuote === '`' && enRaw.includes('${'))) return whole;
    const arabic = decodeLiteral(arQuote, arRaw);
    const english = decodeLiteral(enQuote, enRaw);
    if (!/[\u0600-\u06ff]/.test(arabic) || /[\u0600-\u06ff]/.test(english)) return whole;
    replacements++;
    return `uiText(${predicate.replace(/\s+/g, ' ')}, '${keyFor(english, arabic)}')`;
  });
  const pairedProperties = /(\b(?:en|[A-Za-z0-9_]*En)\s*:\s*)(['"])([^\r\n]*?)\2(\s*,\s*\b(?:ar|[A-Za-z0-9_]*Ar)\s*:\s*)(['"])([^\r\n]*?)\5/g;
  source = source.replace(pairedProperties, (whole, enPrefix, enQuote, enRaw, arPrefix, arQuote, arRaw) => {
    const english = decodeLiteral(enQuote, enRaw);
    const arabic = decodeLiteral(arQuote, arRaw);
    if (!/[\u0600-\u06ff]/.test(arabic) || /[\u0600-\u06ff]/.test(english)) return whole;
    replacements++;
    const key = keyFor(english, arabic);
    return `${enPrefix}uiText(false, '${key}')${arPrefix}uiText(true, '${key}')`;
  });
  source = extractTemplateTernaries(source);
  if (source !== before) {
    if (!source.includes("from '@/lib/ui-text'")) {
      const importLine = "import { uiText } from '@/lib/ui-text';\n";
      const directive = /^(['"]use client['"];?\s*)/;
      source = directive.test(source)
        ? source.replace(directive, `$1\n${importLine}`)
        : `${importLine}${source}`;
    }
    fs.writeFileSync(file, source);
    changedFiles++;
  }
}

fs.writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`);
fs.writeFileSync(arPath, `${JSON.stringify(ar, null, 2)}\n`);
console.log(JSON.stringify({changedFiles, replacements, catalogSize: Object.keys(en.generatedUi).length}));
