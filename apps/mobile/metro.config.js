// Configuration Metro pour un monorepo pnpm.
// Permet à l'app de résoudre les paquets partagés (@comoov/shared) et les
// dépendances hissées à la racine du workspace.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Surveiller tout le monorepo (pour recompiler quand @comoov/shared change)
config.watchFolders = [workspaceRoot];

// 2. Résoudre les modules depuis l'app puis depuis la racine du workspace
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Éviter que Metro remonte au-delà des chemins déclarés
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
