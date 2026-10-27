import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const path of ['index.html', 'styles.css', 'favicon.svg', 'src', 'data', 'assets']) {
  await cp(new URL(path, root), new URL(path, dist), { recursive: true });
}
await writeFile(new URL('.nojekyll', dist), '');
console.log('Static site built in dist/');
