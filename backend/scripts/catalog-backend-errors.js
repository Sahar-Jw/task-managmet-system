const fs = require('fs');
const path = require('path');
const ts = require('../node_modules/typescript');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const exceptionPattern = /^(BadRequest|NotFound|Conflict|Forbidden|Unauthorized)Exception$/;

function visit(dir, files = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(full, files);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) files.push(full);
  }
  return files;
}

function semanticCode(argument, file) {
  let value = argument;
  if (/^['"]/.test(value)) value = value.slice(1, -1);
  value = value
    .replace(/\$\{[^}]+\}/g, ' value ')
    .replace(/\b(?:the|a|an|this|your|its|is|are|be|to|for|of|or|and|currently)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase();
  if (!value || value.length > 88 || /\?|:/.test(argument)) {
    const moduleName = path.basename(path.dirname(file)).replace(/[^a-z0-9]+/gi, '_').toUpperCase();
    value = `${moduleName}_BUSINESS_RULE_VIOLATION`;
  }
  return value.slice(0, 96);
}

let changed = 0;
let sites = 0;
for (const file of visit(sourceRoot)) {
  if (file.endsWith(path.join('common', 'errors', 'app-error.ts'))) continue;
  let source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits = [];
  function walk(node) {
    if (ts.isNewExpression(node) && exceptionPattern.test(node.expression.getText(sf))) {
      const argument = node.arguments?.[0];
      if (argument && !/^appError\s*\(/.test(argument.getText(sf))) {
        const text = argument.getText(sf);
        edits.push({start: argument.getStart(sf), end: argument.getEnd(), text: `appError('${semanticCode(text, file)}', ${text})`});
        sites++;
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sf);
  if (!edits.length) continue;
  for (const edit of edits.reverse()) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  const relative = path.relative(path.dirname(file), path.join(sourceRoot, 'common/errors/app-error')).replace(/\\/g, '/');
  const importPath = relative.startsWith('.') ? relative : `./${relative}`;
  const importLine = `import { appError } from '${importPath}';\n`;
  source = source.replace(/^(import[\s\S]*?;\n)/, `$1${importLine}`);
  fs.writeFileSync(file, source);
  changed++;
}
console.log(JSON.stringify({changedFiles: changed, exceptionSites: sites}));
