// build.js
import esbuild from 'esbuild';
import { readFileSync } from 'node:fs';

// 从 package.json 读取生产依赖
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const external = Object.keys(pkg.dependencies || {});

console.log('Building for production...');
console.log('Marking as external dependencies:', external);

esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  platform: 'node',
  target: 'node23', // 匹配你的 Docker 镜像中的 Node.js 版本
  format: 'esm',
  outfile: 'dist/index.js',
  minify: true,
  // 关键：将所有生产依赖标记为外部依赖
  external: external,
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

console.log('Build successful!');