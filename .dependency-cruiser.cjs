/**
 * Architecture boundary gate — enforces rule R1 from AGENTS.md.
 * Run with: npm run check:architecture
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-is-pure',
      comment:
        'AGENTS.md R1 – domain may only import domain (no application, infrastructure, frontend, npm packages or Node core modules).',
      severity: 'error',
      from: { path: '^src/backend/domain/' },
      to: { pathNot: '^src/backend/domain/' },
    },
    {
      name: 'application-no-infra',
      comment:
        'AGENTS.md R1 – application may only import domain and application (no infrastructure, frontend, npm packages or Node core modules).',
      severity: 'error',
      from: { path: '^src/backend/application/' },
      to: { pathNot: '^src/backend/(application|domain)/' },
    },
    {
      name: 'frontend-no-backend',
      comment: 'AGENTS.md R1 – frontend must not import backend code; talk to it over HTTP via api.service.',
      severity: 'error',
      from: { path: '^src/frontend/' },
      to: { path: '^src/backend/' },
    },
    {
      name: 'no-unresolvable',
      comment: 'Every import must resolve, otherwise the boundary rules above cannot be checked.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.json'],
    },
  },
};
