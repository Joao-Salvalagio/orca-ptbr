#!/usr/bin/env node
// Separa em lotes os textos novos ou alterados desde a última tradução (pendentes/lote_NN.json).
// Uso: node ferramentas/pendentes.js [caracteres por lote, padrão 24000]
const fs = require('fs');
const { caminho, lerJson, gravarJson, fora, fonteAtual } = require('./comum');

const LIMITE = Number(process.argv[2] || 24000);
const fonte = fonteAtual();
const traducoes = lerJson(caminho('traducoes', 'pt-BR.json'), {});
const traduzidoDe = lerJson(caminho('traducoes', 'origem.json'), {});

const porTexto = new Map();
for (const [k, { origem, texto }] of Object.entries(fonte)) {
  if (fora(k, texto)) continue;
  if (k in traducoes && traduzidoDe[k] === texto) continue;
  const id = `${origem}:${texto}`;
  if (!porTexto.has(id)) porTexto.set(id, { origem, texto, chaves: [] });
  porTexto.get(id).chaves.push(k);
}
const itens = [...porTexto.values()].sort((a, b) => a.chaves[0].localeCompare(b.chaves[0]));

fs.rmSync(caminho('pendentes'), { recursive: true, force: true });
const lotes = [];
let atual = [], tamanho = 0;
for (const it of itens) {
  if (tamanho + it.texto.length > LIMITE && atual.length) { lotes.push(atual); atual = []; tamanho = 0; }
  atual.push(it); tamanho += it.texto.length;
}
if (atual.length) lotes.push(atual);

const indice = {};
lotes.forEach((lote, i) => {
  const n = String(i + 1).padStart(2, '0');
  const entrada = {};
  lote.forEach((it, j) => {
    const id = `${n}-${j + 1}`;
    indice[id] = it;
    entrada[id] = { chave: it.chaves[0], ...(it.origem === 'es' ? { origem: 'espanhol' } : {}), texto: it.texto };
  });
  gravarJson(caminho('pendentes', `lote_${n}.json`), entrada);
});
gravarJson(caminho('pendentes', 'indice.json'), indice);
console.log(`${itens.length} textos distintos pendentes (${itens.reduce((s, i) => s + i.chaves.length, 0)} chaves) em ${lotes.length} lotes, em pendentes/.`);
