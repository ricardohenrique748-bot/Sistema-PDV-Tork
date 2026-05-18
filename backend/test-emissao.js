const { emitirNF } = require('./src/services/nfe/nfeService');
emitirNF('4cde8606-3ca1-4175-8f8b-b927707e818d').then(console.log).catch(err => console.error('Erro:', err));
