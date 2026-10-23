#!/usr/bin/env node
// Lê o catálogo de textos da instalação local do Orca e grava fonte/en.json (chave → texto em inglês).
// Uso: node ferramentas/extrair.js [pasta de instalação do Orca]
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const INSTALACAO = process.argv[2] || padraoDeInstalacao();
const RECURSOS = path.join(INSTALACAO, 'resources');
const ASAR = path.join(RECURSOS, 'app.asar');
const OUT = path.join(RECURSOS, 'app.asar.unpacked', 'out');
const IDIOMAS_DE_REFERENCIA = /^(es|fr|ja|ko|zh)-.*\.js$/;

function padraoDeInstalacao() {
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || '', 'Programs', 'orca');
  if (process.platform === 'darwin') return '/Applications/Orca.app/Contents';
  return path.join(os.homedir(), '.local', 'share', 'orca');
}

function lerAsar(arquivo) {
  const dados = fs.readFileSync(arquivo);
  const tamanhoDoCabecalho = dados.readUInt32LE(12);
  const cabecalho = JSON.parse(dados.subarray(16, 16 + tamanhoDoCabecalho).toString('utf8'));
  const base = 8 + dados.readUInt32LE(4);
  const arquivos = new Map();
  (function andar(no, prefixo) {
    for (const [nome, filho] of Object.entries(no.files || {})) {
      const caminho = prefixo ? `${prefixo}/${nome}` : nome;
      if (filho.files) andar(filho, caminho);
      else if (!filho.unpacked) {
        const inicio = base + Number(filho.offset);
        arquivos.set(caminho, () => dados.subarray(inicio, inicio + filho.size).toString('utf8'));
      }
    }
  })(cabecalho, '');
  return arquivos;
}

function achatar(objeto, prefixo = '', saida = {}) {
  for (const [chave, valor] of Object.entries(objeto)) {
    const caminho = prefixo ? `${prefixo}.${chave}` : chave;
    if (valor && typeof valor === 'object') achatar(valor, caminho, saida);
    else saida[caminho] = valor;
  }
  return saida;
}

function arquivosJs(pasta) {
  const lista = [];
  (function andar(p) {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const c = path.join(p, e.name);
      if (e.isDirectory()) { if (e.name !== 'mobile-web') andar(c); }
      else if (/\.(c|m)?js$/.test(e.name) && !IDIOMAS_DE_REFERENCIA.test(e.name)) lista.push(c);
    }
  })(pasta);
  return lista;
}

function catalogoDeReferencia() {
  const pasta = path.join(OUT, 'main', 'chunks');
  const arquivo = fs.readdirSync(pasta).find(f => /^es-.*\.js$/.test(f));
  if (!arquivo) throw new Error(`catálogo espanhol não encontrado em ${pasta}`);
  const exportado = {};
  vm.runInNewContext(fs.readFileSync(path.join(pasta, arquivo), 'utf8'), { exports: exportado, module: { exports: exportado } });
  return Object.fromEntries(Object.entries(achatar(exportado)).filter(([k]) => !k.startsWith('default.')));
}

function catalogoInglesEmbutido() {
  const pasta = path.join(OUT, 'renderer', 'assets');
  for (const f of fs.readdirSync(pasta).filter(f => /^i18n-.*\.js$/.test(f))) {
    let codigo = fs.readFileSync(path.join(pasta, f), 'utf8');
    const m = codigo.match(/resources:\{en:\{translation:([A-Za-z_$][\w$]*)\}\}/);
    if (!m) continue;
    codigo = codigo.replace(/^import\{[^}]*\}from"[^"]+";/, 'var e=(f)=>f();')
      .replace(/import\.meta\.url/g, '""')
      .replace(/export\{[^}]*\};?\s*$/, `__saida.en=${m[1]};`);
    const caixa = { __saida: {}, console, setTimeout, clearTimeout, Intl };
    vm.runInNewContext(codigo, caixa);
    return achatar(caixa.__saida.en);
  }
  throw new Error('catálogo inglês embutido não encontrado');
}

function textosPadraoNoCodigo(chaves, fontes) {
  const achados = {};
  const re = /\(\s*[`'"]([A-Za-z0-9_.-]+)[`'"]\s*,\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
  for (const codigo of fontes) {
    let m;
    while ((m = re.exec(codigo))) {
      if (!chaves.has(m[1]) || (m[2].startsWith('`') && m[2].includes('${'))) continue;
      try {
        const s = vm.runInNewContext(m[2]);
        if (typeof s === 'string') achados[m[1]] = s;
      } catch { /* literal que não é texto simples */ }
    }
  }
  return achados;
}

const versao = JSON.parse(fs.readFileSync(path.join(OUT, 'package.json'), 'utf8')).version;
const referencia = catalogoDeReferencia();
const chaves = new Set(Object.keys(referencia));
const asar = lerAsar(ASAR);
const fontes = [
  ...arquivosJs(OUT).map(f => fs.readFileSync(f, 'utf8')),
  ...[...asar.entries()].filter(([c]) => /\.(c|m)?js$/.test(c)).map(([, ler]) => ler()),
];
const ingles = { ...textosPadraoNoCodigo(chaves, fontes) };
for (const [k, v] of Object.entries(catalogoInglesEmbutido())) if (chaves.has(k)) ingles[k] = v;

const en = {}, semIngles = {};
for (const k of [...chaves].sort()) {
  if (k in ingles) en[k] = ingles[k];
  else semIngles[k] = referencia[k];
}
fs.mkdirSync(path.join(RAIZ, 'fonte'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'fonte', 'en.json'), JSON.stringify(en, null, 1) + '\n');
fs.writeFileSync(path.join(RAIZ, 'fonte', 'sem-ingles.json'), JSON.stringify(semIngles, null, 1) + '\n');
fs.writeFileSync(path.join(RAIZ, 'fonte', 'versao.txt'), versao + '\n');
const liberadas = fontes.map(c => c.match(/new Set\(`(auto\.components\.settings\.[^`]*)`\.split\(`,`\)\)/)).find(Boolean);
if (!liberadas) throw new Error('lista de chaves de plugin liberadas não encontrada');
fs.writeFileSync(path.join(__dirname, 'chaves-de-plugin-liberadas.json'), JSON.stringify(liberadas[1].split(','), null, 1) + '\n');
console.log(`Orca ${versao}: ${chaves.size} chaves, ${Object.keys(en).length} com inglês, ${Object.keys(semIngles).length} só na referência (texto em espanhol em fonte/sem-ingles.json).`);
