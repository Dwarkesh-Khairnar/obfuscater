#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');
const { Base64 } = require('js-base64');

const argv = process.argv.slice(2);
if (argv.length < 1) {
  console.error('Usage: node html-obfuscate.js <input.html> [--mode minify|base64|escaped] [--out out.txt]');
  process.exit(2);
}

const inputPath = argv[0];
const modeFlag = argv.find(a => a.startsWith('--mode=')) || argv.find(a => a === '--mode') || null;
let mode = 'base64';
if (modeFlag) {
  const m = modeFlag.includes('=') ? modeFlag.split('=')[1] : argv[argv.indexOf(modeFlag) + 1];
  if (m) mode = m;
} else {
  const mIdx = argv.indexOf('--mode');
  if (mIdx !== -1 && argv[mIdx+1]) mode = argv[mIdx+1];
}

const outFlagIdx = argv.findIndex(a => a.startsWith('--out='));
let outPath = null;
if (outFlagIdx !== -1) outPath = argv[outFlagIdx].split('=')[1];
else {
  const oi = argv.indexOf('--out');
  if (oi !== -1) outPath = argv[oi+1];
}

async function run() {
  try {
    const input = fs.readFileSync(inputPath, 'utf8');

    const minified = await minify(input, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      minifyCSS: true,
      minifyJS: true,
      keepClosingSlash: true
    });

    let output;
    if (mode === 'minify') {
      output = minified;
    } else if (mode === 'base64') {
      const b64 = Base64.encode(minified);
      output = 'data:text/html;base64,' + b64;
    } else if (mode === 'escaped') {
      // produce an escaped string suitable for unescape() or decodeURIComponent usage
      const encoded = encodeURIComponent(minified).replace(/'/g, '%27').replace(/"/g, '%22');
      output = "var s = unescape('" + encoded.replace(/%/g, '%25') + "');\n" +
               "var blob = new Blob([s], {type:'text/html'});\n" +
               "var url = URL.createObjectURL(blob);\n" +
               "document.getElementById('appFrame').src = url;\n";
    } else {
      console.error('Unknown mode:', mode);
      process.exit(3);
    }

    if (outPath) {
      fs.writeFileSync(outPath, output, 'utf8');
      console.log('Wrote to', outPath);
    } else {
      console.log(output);
    }
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

run();
