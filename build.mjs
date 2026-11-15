// Build/dev script using esbuild directly — same approach as this app's
// very first, framework-free delivery, extended with one more step:
// compiling the Tailwind v4 stylesheet (src/styles.css) that the visual
// redesign brought with it. Nothing here is a Vite plugin or a
// TanStack Start build: this is the whole build.
import * as esbuild from 'esbuild';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);

const root = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(root, 'dist');
const serveMode = process.argv.includes('--serve');

fs.rmSync(outdir, { recursive: true, force: true });
fs.mkdirSync(outdir, { recursive: true });

// Resolves the `@/...` imports used throughout src/components/os,
// src/dashboards and src/lib/os (the Lovable-authored visual layer) to
// `src/...`, so those files could be carried over unmodified instead of
// rewriting every import to a relative path.
//
// Delegates back into esbuild's own resolver (`build.resolve`) rather
// than just returning a rewritten path directly: most of these imports
// have no file extension (`@/lib/os/store`, not `.../store.tsx`), and a
// plugin that hands esbuild a bare extensionless path back gets
// "Cannot read file" — only re-running esbuild's own resolution (which
// probes .tsx/.ts/.jsx/.js the normal way) handles that. Verified
// against a minimal repro covering a .ts import, a .tsx import, and the
// one .json import this app has (the office-photo asset pointer).
/** @type {import('esbuild').Plugin} */
const atAliasPlugin = {
  name: 'at-alias',
  setup(build) {
    build.onResolve({ filter: /^@\// }, async (args) => {
      const result = await build.resolve('./' + args.path.slice(2), {
        kind: args.kind,
        resolveDir: path.join(root, 'src'),
      });
      if (result.errors.length > 0) return { errors: result.errors };
      return { path: result.path };
    });
  },
};

function copyStatic() {
  fs.copyFileSync(path.join(root, 'index.html'), path.join(outdir, 'index.html'));
  const publicDir = path.join(root, 'public');
  if (fs.existsSync(publicDir)) fs.cpSync(publicDir, outdir, { recursive: true });
}

// Resolved by reading @tailwindcss/cli's own package.json `bin` field and
// invoking that JS file directly with `node`, rather than spawning
// node_modules/.bin/tailwindcss as if it were a plain executable. The
// latter is a POSIX shell script on Mac/Linux but a .cmd/.ps1 shim on
// Windows — spawning the extensionless name directly fails there with
// ENOENT (confirmed: that's exactly what happened on a real Windows
// `npm run dev`). Running `node <resolved .mjs/.js file>` works
// identically on every platform, no shell involved.
function resolveTailwindCliEntry() {
  const pkgPath = require.resolve('@tailwindcss/cli/package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const binField = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.tailwindcss;
  if (!binField) throw new Error('@tailwindcss/cli package.json has no usable "bin" entry.');
  return path.join(path.dirname(pkgPath), binField);
}

function runTailwind() {
  return new Promise((resolve, reject) => {
    let entry;
    try {
      entry = resolveTailwindCliEntry();
    } catch (err) {
      reject(new Error(
        'Could not find @tailwindcss/cli to compile src/styles.css. Run `npm install` first — ' +
        'that package is a devDependency. Original error: ' + err.message,
      ));
      return;
    }
    fs.mkdirSync(path.join(outdir, 'styles'), { recursive: true });
    execFile(process.execPath, [entry, '-i', path.join(root, 'src/styles.css'), '-o', path.join(outdir, 'styles/app.css')], (err, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (err) {
        reject(new Error(
          'Could not run the Tailwind CLI (@tailwindcss/cli) to compile src/styles.css. Original error: ' + err.message,
        ));
      } else resolve();
    });
  });
}

const buildOptions = {
  entryPoints: [path.join(root, 'src/main.tsx')],
  bundle: true,
  outfile: path.join(outdir, 'bundle.js'),
  format: 'esm',
  target: ['es2020'],
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.ts': 'ts', '.svg': 'text', '.json': 'json' },
  plugins: [atAliasPlugin],
  sourcemap: true,
  minify: !serveMode,
  define: { 'process.env.NODE_ENV': serveMode ? '"development"' : '"production"' },
  logLevel: 'info',
};

copyStatic();
await runTailwind();

if (serveMode) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: outdir, port: 5173 });
  console.log(`\nAvenado OS dev server running at http://localhost:${port}/`);
  // Re-run on change so css/html/public edits show up without a full
  // restart (esbuild's own watch only covers bundle.js's graph).
  fs.watch(path.join(root, 'src'), { recursive: true }, (_evt, file) => {
    if (file && file.endsWith('.css')) runTailwind().catch((e) => console.error(e.message));
  });
  fs.watch(path.join(root, 'index.html'), () => copyStatic());
  if (fs.existsSync(path.join(root, 'public'))) fs.watch(path.join(root, 'public'), () => copyStatic());
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete ->', outdir);
}
