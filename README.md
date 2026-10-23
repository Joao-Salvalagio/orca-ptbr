# orca-ptbr

Tradução completa da interface do [Orca](https://github.com/stablyai/orca) para o português do Brasil,
como pacote de idioma (plugin `joao-salvalagio.orca-ptbr`, idioma `pt-BR`).

O pacote oficial que vem com o Orca traduz só a navegação básica. Este cobre o catálogo inteiro da versão
indicada em [`fonte/versao.txt`](fonte/versao.txt): configurações, barras laterais, editor, terminal, chat dos
agentes, integrações (GitHub, GitLab, Linear, Jira), onboarding, menus e bandeja. O que faltar cai no inglês.

## Instalar

1. Clone o repositório:
   ```
   git clone https://github.com/Joao-Salvalagio/orca-ptbr.git
   ```
2. No Orca: **Settings → Plugins → Development → Add path** e escolha a pasta clonada.
3. **Settings → Appearance → Language** → **Português do Brasil (completo)**.

Se o pacote oficial (`stablyai.orca-portuguese`) também estiver ativo, desative-o para não haver dois pt-BR.

## Atualizar quando o Orca mudar

Requer Node.js 18+. Tudo roda localmente, a partir da sua instalação do Orca.

```
node ferramentas/extrair.js      # lê os textos da versão instalada → fonte/
node ferramentas/pendentes.js    # separa os textos novos ou alterados em pendentes/lote_NN.json
#   traduza cada lote seguindo ferramentas/GUIA-DE-TRADUCAO.md e grave em pendentes/saida/lote_NN.json
node ferramentas/aplicar.js      # valida e grava as traduções em traducoes/
node ferramentas/montar.js       # gera locales/pt-BR.json e confere as regras do carregador do Orca
```

Depois, no Orca, recarregue o plugin (ou reinicie o app).

## Como está organizado

| Caminho | O que é |
|---|---|
| `orca-plugin.json` | Manifesto do plugin |
| `locales/pt-BR.json` | O pacote que o Orca carrega (gerado por `montar.js`) |
| `traducoes/pt-BR.json` | Traduções, chave → texto em português |
| `traducoes/origem.json` | Texto em inglês de cada chave no momento da tradução (detecta o que mudou) |
| `fonte/` | Textos em inglês da versão instalada do Orca (gerado por `extrair.js`) |
| `ferramentas/GUIA-DE-TRADUCAO.md` | Estilo, glossário e o que nunca traduzir |

## Escolhas de tradução

- **workspace → espaço de trabalho**; project → projeto; agent → agente; tab → aba; pane → painel.
- Termos de dev ficam em inglês: branch, commit, worktree, pull request, merge, diff, prompt, skill, hook.
- Tratamento por você; só a primeira letra maiúscula, como é o padrão em português.
- Variáveis (`{{value0}}`), marcações e espaços nas pontas são conferidos automaticamente.

O carregador do Orca recusa pacotes que mexam nos textos de segurança dos plugins
(`auto.components.settings.plugin*`); essas chaves ficam em inglês de propósito.

## Licença

MIT. Os textos em inglês e a estrutura de chaves vêm do Orca, também MIT; o aviso de copyright dele está em
[`LICENSE`](LICENSE). Projeto independente, sem vínculo com a Stably/Lovecast.
