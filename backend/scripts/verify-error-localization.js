const fs = require('fs');
const path = require('path');
const ts = require('../node_modules/typescript');

const sourceRoot = path.resolve(__dirname, '../src');
const exceptionNames = new Set([
  'BadRequestException', 'NotFoundException', 'ConflictException',
  'ForbiddenException', 'UnauthorizedException',
]);
const files = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) files.push(full);
  }
}
visit(sourceRoot);

const failures = [];
const codes = new Map();
let sites = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function walk(node) {
    if (ts.isNewExpression(node) && exceptionNames.has(node.expression.getText(sf))) {
      sites++;
      const argument = node.arguments?.[0];
      if (!argument || !ts.isCallExpression(argument) || argument.expression.getText(sf) !== 'appError') {
        failures.push(`${path.relative(sourceRoot, file)}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} is not catalogued`);
      } else {
        const codeNode = argument.arguments[0];
        const code = codeNode && ts.isStringLiteral(codeNode) ? codeNode.text : '';
        if (!/^[A-Z][A-Z0-9_]{2,95}$/.test(code)) failures.push(`${file}: invalid stable code ${code || '(missing)'}`);
        const message = argument.arguments[1]?.getText(sf) || '';
        if (codes.has(code) && codes.get(code) !== message) failures.push(`${file}: code ${code} is reused for different messages`);
        codes.set(code, message);
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sf);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Verified ${sites} localized HTTP exception sites using ${codes.size} stable codes.`);
