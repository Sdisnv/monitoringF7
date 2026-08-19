'use strict';
/* Require statique relatif : esbuild bundle le parseur dans la fonction Netlify.
   Un chemin calculé à l'exécution laisse assets/js hors du zip (502 ImportModuleError). */
module.exports = require('../../assets/js/scope-csv-import.js');
