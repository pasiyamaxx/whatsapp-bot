const fs = require('fs').promises;
const path = require('path');

async function loadModulesRecursively(dir, options = {}) {
 const exportedModules = {};
 const { excludeDirs = [], excludeFiles = [], fileExtensions = ['.js'], silent = true } = options;

 async function traverseDirectory(currentPath) {
  try {
   const files = await fs.readdir(currentPath);

   for (const file of files) {
    const filePath = path.join(currentPath, file);
    const fileStats = await fs.stat(filePath);

    if (fileStats.isDirectory() && !excludeDirs.includes(file)) {
     await traverseDirectory(filePath);
    } else if (fileStats.isFile() && fileExtensions.includes(path.extname(file)) && !excludeFiles.includes(file)) {
     const moduleName = path.basename(file, path.extname(file));
     try {
      const moduleExports = require(filePath);
      if (typeof moduleExports === 'object' && moduleExports !== null) {
       Object.entries(moduleExports).forEach(([key, value]) => {
        if (exportedModules[key] && !silent) {
         console.warn(`Warning: Duplicate export '${key}' found in ${file}. Overwriting previous definition.`);
        }
        exportedModules[key] = value;
       });
      } else {
       exportedModules[moduleName] = moduleExports;
      }
     } catch (error) {
      if (!silent) {
       console.error(`Failed to load module ${file}:`, error);
      }
     }
    }
   }
  } catch (error) {
   if (!silent) {
    console.error(`Error reading directory ${currentPath}:`, error);
   }
  }
 }

 await traverseDirectory(dir);
 for (const key of Object.keys(exportedModules)) {
  Object.defineProperty(exportedModules, key, {
   enumerable: false,
   configurable: false,
   writable: false,
  });
 }

 return exportedModules;
}

module.exports = loadModulesRecursively;
