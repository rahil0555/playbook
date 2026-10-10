// Writes dist-lib/package.json so the folder can be installed as a package:
//   npm install ../path/to/dist-lib
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const css = readdirSync(new URL('../dist-lib', import.meta.url)).find((f) => f.endsWith('.css'));
if (!css) throw new Error('dist-lib has no CSS file');

const pkg = {
  name: '@edurance/playlab',
  version: root.version,
  description: 'Edurance PlayLab - embeddable interactive learning playground (React)',
  type: 'module',
  sideEffects: ['**/*.css'],
  main: './playlab.js',
  module: './playlab.js',
  types: './types/index.d.ts',
  style: `./${css}`,
  exports: {
    '.': { types: './types/index.d.ts', import: './playlab.js' },
    './style.css': `./${css}`,
  },
  files: ['*'],
  peerDependencies: {
    react: '>=18.2.0',
    'react-dom': '>=18.2.0',
    'framer-motion': '>=12.0.0',
  },
};
writeFileSync(new URL('../dist-lib/package.json', import.meta.url), `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`dist-lib/package.json written (style: ${css})`);
