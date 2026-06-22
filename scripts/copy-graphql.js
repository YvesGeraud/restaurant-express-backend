const fs = require('fs');
const path = require('path');

function copyFolderRecursiveSync(sources, target) {
  const srcDir = path.join(...sources);
  const destDir = path.join(...target);

  if (!fs.existsSync(srcDir)) {
    console.warn(`[Copy GraphQL] Warning: Source directory "${srcDir}" does not exist.`);
    return;
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir);
  files.forEach((file) => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);

    const stat = fs.lstatSync(srcPath);
    if (stat.isDirectory()) {
      copyFolderRecursiveSync([...sources, file], [...target, file]);
    } else if (file.endsWith('.graphql')) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`[Copy GraphQL] Copied: ${file} -> ${destDir}`);
    }
  });
}

console.log('[Copy GraphQL] Starting copy of GraphQL schema files to dist...');
copyFolderRecursiveSync(['src', 'graphql', 'schema'], ['dist', 'graphql', 'schema']);
console.log('[Copy GraphQL] Finished.');
