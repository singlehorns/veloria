import { defineConfig } from 'astro/config';
import path from 'node:path';

const extensionlessA11yDependencyResolver = {
  name: 'extensionless-a11y-dependency-resolver',
  setup(build) {
    build.onResolve({ filter: /^\.\/.+$/ }, (args) => {
      const importer = args.importer.replace(/\\/g, '/');
      const isA11yDependency =
        importer.includes('/node_modules/aria-query/lib/') ||
        importer.includes('/node_modules/axobject-query/lib/');

      return isA11yDependency
        ? { path: path.resolve(args.resolveDir, `${args.path.slice(2)}.js`) }
        : null;
    });
  }
};

export default defineConfig({
  site: 'https://www.dsdiamond.com.tw',
  output: 'static',
  vite: {
    optimizeDeps: {
      noDiscovery: true,
      exclude: ['aria-query', 'axobject-query'],
      esbuildOptions: {
        plugins: [extensionlessA11yDependencyResolver]
      }
    }
  }
});
