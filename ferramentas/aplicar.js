#!/usr/bin/env node
// Valida pendentes/saida/lote_NN.json e grava as traduções aprovadas em traducoes/.
// Uso: node ferramentas/aplicar.js [NN ...]   (sem números: todos os lotes com saída)
const fs = require('fs');
const { caminho, lerJson, gravarJson, problemasDaTraducao } = require('./comum');

const indice = lerJson(caminho('pendentes', 'indice.json'), null);
if (!indice) { console.error('Rode antes: node ferramentas/pendentes.js'); process.exit(1); }
const pastaSaida = caminho('pendentes', 'saida');
const numeros = process.argv.slice(2).length
  ? process.argv.slice(2)
  : (fs.existsSync(pastaSaida) ? fs.readdirSync(pastaSaida) : []).map(f => (f.match(/^lote_(\d+)\.json$/) || [])[1]).filter(Boolean);

const traducoes = lerJson(caminho('traducoes', 'pt-BR.json'), {});
const traduzidoDe = lerJson(caminho('traducoes', 'origem.json'), {});
let aplicadas = 0;
const recusadas = [];
for (const n of numeros) {
  const saida = lerJson(caminho('pendentes', 'saida', `lote_${n}.json`), {});
  for (const [id, it] of Object.entries(indice).filter(([id]) => id.startsWith(`${n}-`))) {
    const problemas = problemasDaTraducao(it.texto, saida[id], it.chaves[0]);
    if (problemas.length) { recusadas.push({ id, chave: it.chaves[0], texto: it.texto, traducao: saida[id], problemas }); continue; }
    for (const k of it.chaves) { traducoes[k] = saida[id]; traduzidoDe[k] = it.texto; }
    aplicadas++;
  }
}
const ordenar = (o) => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));
gravarJson(caminho('traducoes', 'pt-BR.json'), ordenar(traducoes));
gravarJson(caminho('traducoes', 'origem.json'), ordenar(traduzidoDe));
gravarJson(caminho('pendentes', 'recusadas.json'), recusadas);
console.log(`lotes ${numeros.join(', ') || 'nenhum'}: ${aplicadas} textos aplicados, ${recusadas.length} recusados (pendentes/recusadas.json).`);
