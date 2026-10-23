#!/usr/bin/env node
// Gera locales/pt-BR.json a partir de traducoes/ e confere as regras que o Orca aplica ao carregar o pacote.
// Uso: node ferramentas/montar.js
const fs = require('fs');
const { caminho, lerJson, fonteAtual, protegida, problemasDaTraducao } = require('./comum');

const LIMITE_DE_ENTRADAS = 20000, LIMITE_DE_PROFUNDIDADE = 16, LIMITE_DE_TEXTO = 8192;
const PROIBIDAS = new Set(['__proto__', 'prototype', 'constructor']);

const fonte = fonteAtual();
const traducoes = lerJson(caminho('traducoes', 'pt-BR.json'), {});
const erros = [];
const catalogo = {};
let entradas = 0, obsoletas = 0;
for (const [k, texto] of Object.entries(traducoes).sort(([a], [b]) => a.localeCompare(b))) {
  if (!(k in fonte)) { obsoletas++; continue; }
  if (protegida(k)) { erros.push(`${k}: chave protegida`); continue; }
  const problemas = problemasDaTraducao(fonte[k].texto, texto, k);
  if (problemas.length) { erros.push(`${k}: ${problemas.join(', ')}`); continue; }
  if (texto.length > LIMITE_DE_TEXTO) { erros.push(`${k}: passa de ${LIMITE_DE_TEXTO} caracteres`); continue; }
  const partes = k.split('.');
  if (partes.length > LIMITE_DE_PROFUNDIDADE) { erros.push(`${k}: profundidade maior que ${LIMITE_DE_PROFUNDIDADE}`); continue; }
  if (partes.some(p => !p || p.length > 128 || PROIBIDAS.has(p) || /[\x00-\x1f]/.test(p))) { erros.push(`${k}: chave insegura`); continue; }
  let no = catalogo, conflito = false;
  for (const p of partes.slice(0, -1)) {
    if (typeof no[p] === 'string') { conflito = true; break; }
    if (!no[p]) { no[p] = {}; entradas++; }
    no = no[p];
  }
  const folha = partes[partes.length - 1];
  if (conflito || typeof no[folha] === 'object') { erros.push(`${k}: conflita com outra chave`); continue; }
  no[folha] = texto;
  entradas++;
}
if (entradas > LIMITE_DE_ENTRADAS) erros.push(`catálogo com ${entradas} entradas (limite ${LIMITE_DE_ENTRADAS})`);
if (erros.length) {
  console.error(`${erros.length} erros; locales/pt-BR.json não foi gravado:\n` + erros.slice(0, 40).join('\n'));
  process.exit(1);
}
fs.writeFileSync(caminho('locales', 'pt-BR.json'), JSON.stringify(catalogo, null, 1) + '\n');
const traduziveis = Object.keys(fonte).length;
const feitas = Object.keys(traducoes).filter(k => k in fonte).length;
console.log(`locales/pt-BR.json: ${feitas} de ${traduziveis} chaves (${(100 * feitas / traduziveis).toFixed(1)}%), ${entradas} entradas, ${obsoletas} traduções de chaves que saíram do Orca ignoradas.`);
