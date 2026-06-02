import coreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  ...coreWebVitals,
  {
    // Reglas del React Compiler — indican componentes que el compilador no puede optimizar.
    // Se mantienen como warn para feedback sin bloquear el build.
    rules: {
      'react-hooks/set-state-in-effect':    'warn',
      'react-hooks/purity':                 'warn',
      'react-hooks/incompatible-library':   'warn',
    },
  },
];
