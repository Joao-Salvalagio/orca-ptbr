const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const caminho = (...partes) => path.join(RAIZ, ...partes);
const lerJson = (arquivo, padrao) => (fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : padrao);
const gravarJson = (arquivo, dados) => {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, JSON.stringify(dados, null, 1) + '\n');
};

const PREFIXO_PROTEGIDO = 'auto.components.settings.';
const liberadas = new Set(lerJson(caminho('ferramentas', 'chaves-de-plugin-liberadas.json'), []));
const protegida = (k) => k.startsWith(PREFIXO_PROTEGIDO) && !liberadas.has(k) && /^plugin/i.test(k.slice(PREFIXO_PROTEGIDO.length));
const pareceCss = (s) => /\{[^{}]*[a-z-]+\s*:\s*[^;{}]+;[^{}]*\}/i.test(s);
const semLetras = (s) => !/\p{L}/u.test(s);
const fora = (k, s) => protegida(k) || pareceCss(s) || semLetras(s);

const marcas = (s) => [
  ...(s.match(/\{\{[^}]+\}\}/g) || []),
  ...(s.match(/\$t\([^)]*\)/g) || []),
  ...(s.match(/<\/?[A-Za-z0-9]+\s*\/?>/g) || []),
  ...(s.match(/\[\[|\]\]/g) || []),
  ...(s.match(/\n/g) || []),
].sort().join('|');
const pontas = (s) => [s.match(/^\s*/)[0], s.match(/\s*$/)[0]].join('|');

const excecoes = lerJson(caminho('ferramentas', 'excecoes.json'), {});

function problemasDaTraducao(origem, traducao, chave) {
  const lista = [];
  if (typeof traducao !== 'string' || !traducao.trim()) return ['vazia'];
  if (chave && chave in excecoes) return lista;
  if (marcas(origem) !== marcas(traducao)) lista.push('variáveis ou marcação diferentes');
  if (pontas(origem) !== pontas(traducao)) lista.push('espaços nas pontas diferentes');
  return lista;
}

function fonteAtual() {
  const en = lerJson(caminho('fonte', 'en.json'), {});
  const semIngles = lerJson(caminho('fonte', 'sem-ingles.json'), {});
  const tudo = {};
  for (const [k, v] of Object.entries(en)) tudo[k] = { origem: 'en', texto: v };
  for (const [k, v] of Object.entries(semIngles)) tudo[k] = { origem: 'es', texto: v };
  return tudo;
}

module.exports = { RAIZ, caminho, lerJson, gravarJson, fora, protegida, problemasDaTraducao, fonteAtual };
