# Gerador de Audiencia Previa

## Objetivo

Aplicacao web para importar um arquivo CSV de audiencia em tempo real e gerar uma visualizacao em grafico de linha, com layout de audiencia previa da TV Globo DF.

A aplicacao permite importar CSV, exibir grafico por emissora, mostrar medias e shares, marcar intervalos comerciais, marcar participacoes locais, inserir nome do programa, inserir nome do apresentador, inserir media historica e variacao, e gerar uma imagem PNG final.

## Tipo de Aplicacao

Aplicacao web estatica, sem backend.

Arquivos principais:

- `index.html`
- `styles.css`
- `script.js`
- `logo-data.js`
- `assets/`
- `fonts/`

Pode ser hospedada em GitHub Pages, Netlify, Cloudflare Pages, Vercel ou qualquer ambiente que sirva HTML, CSS e JavaScript estatico.

## Tecnologias

- HTML
- CSS
- JavaScript puro
- Canvas API
- FileReader API
- Imagens embutidas em Base64 via `logo-data.js`
- Fontes locais Globotipo

## Estrutura Dos Arquivos

### `index.html`

Contem a estrutura visual da aplicacao:

- Cabecalho com titulo `AUDIENCIA PREVIA`.
- Campo editavel de programa.
- Botao `Baixar imagem`.
- Aviso de validacao ao lado do botao.
- Campo `Apresentacao`.
- Card de data e horario.
- Faixa de indicadores das emissoras.
- Campo de media historica.
- Campos de intervalo.
- Campos de participacao local.
- Area do grafico em canvas.
- Rodape com fonte dos dados.

### `styles.css`

Define o layout visual:

- Tipografia Globotipo.
- Cores das emissoras.
- Responsividade.
- Estilo dos cards superiores.
- Estilo dos campos de intervalo.
- Estilo da participacao local.
- Estado vazio antes da importacao do CSV.

### `script.js`

Contem toda a logica da aplicacao:

- Leitura do CSV.
- Deteccao automatica de delimitador.
- Extracao de metadados.
- Extracao de medias e shares.
- Construcao das series.
- Desenho do grafico.
- Marcacao de intervalos.
- Marcacao de participacoes locais.
- Destaques da Globo.
- Validacao antes do download.
- Geracao da imagem final em PNG.

### `logo-data.js`

Contem logos embutidas em Base64 para evitar problemas de CORS no canvas e permitir que a imagem baixada contenha as logos corretamente.

### `assets/`

Contem imagens originais das logos:

- `GLOBO.png`
- `RECORD.png`
- `BAND.png`
- `SBT.png`
- `REDETV.png`
- `tvglobo.png`
- `programa-df1.png`
- `programa-df2.png`
- `programa-bom-dia-df.png`
- `programa-globo-comunidade.png`
- `programa-globo-esporte.png`
- `programa-boletim-df2.png`
- `programa-bomdiabrasil.png`

### `fonts/`

Contem as fontes:

- `GlobotipoCorporativa-Regular.ttf`
- `GlobotipoCorporativa-Bold.ttf`

## Fluxo De Uso

1. Usuario abre a aplicacao.
2. Usuario informa o nome do programa.
3. Usuario informa o nome do apresentador.
4. Usuario importa o CSV.
5. A aplicacao gera o grafico automaticamente.
6. Usuario pode inserir intervalos, participacoes locais, media historica e variacao.
7. Usuario clica em `Baixar imagem`.
8. A aplicacao valida os campos obrigatorios.
9. A aplicacao gera PNG em `1600 x 900`.

## Campos Da Interface

### Programa

Campo editavel no topo. Valor padrao: `PROGRAMA`.

Quando o usuario clica no campo, o texto e apagado para facilitar a digitacao.

Na imagem gerada, o nome do programa aparece ao lado de `AUDIENCIA PREVIA`. Se o nome informado corresponder a uma logo cadastrada, a logo substitui o texto.

### Apresentacao

Campo para nome do apresentador. Placeholder: `Nome do apresentador`.

Quando o usuario clica no campo, o texto e apagado.

Na imagem gerada, aparece ao lado do nome/logo do programa como: `Apresentacao: Nome do apresentador`.

### Media Historica

Categoria com dois campos:

- Audiencia
- Variacao

A variacao sempre usa `%`.

Se o valor for positivo, recebe `+` na frente e fica em azul claro. Se for negativo, mantem `-` e fica vermelho.

Na imagem gerada, a media historica aparece ao lado do resultado da Globo no cabecalho.

### Intervalos

Permite adicionar um ou mais periodos de intervalo.

Cada linha possui:

- Inicio
- Fim
- Botao para remover

No grafico, o intervalo aparece como uma faixa vertical cinza clara. A legenda `Intervalo` aparece no topo do grafico.

### Participacao Local

Permite adicionar um ou mais periodos de participacao local.

Cada linha possui:

- Inicio
- Fim
- Botao para remover

No grafico, a participacao local aparece como faixa vertical em tom laranja claro.

Cor principal: `#f6ac8e`.

No canvas, a faixa usa transparencia: `rgba(246, 172, 142, 0.34)`.

A legenda `Participacao local` so aparece quando houver ao menos um periodo preenchido.

## Validacoes Antes Do Download

Ao clicar em `Baixar imagem`, a aplicacao valida:

1. Se existe CSV importado.
2. Se o campo `PROGRAMA` foi preenchido.
3. Se o campo `Apresentacao` foi preenchido.

Se nao houver CSV, mostra: `Importe um CSV antes de baixar a imagem.`

Se faltar programa ou apresentador, mostra: `Preencha o nome do PROGRAMA e o nome do Apresentador antes de baixar a imagem.`

O aviso aparece ao lado do botao `Baixar imagem`.

## Formato Esperado Do CSV

A aplicacao tenta detectar automaticamente o delimitador.

Delimitadores aceitos:

- virgula
- ponto e virgula
- tabulacao

A aplicacao procura uma linha de cabecalho que contenha a coluna `MIN`.

A coluna `MIN` representa o eixo do tempo.

Exemplo:

```csv
MIN;GLOBO;RECORD;SBT;TV BAND;TV BRASILIA;CONTEUDO TV;TOTAL LIGADOS
06:00;6.1;3.9;0.8;0.6;0.1;13.2;36.0
06:01;6.2;3.8;0.8;0.6;0.1;13.1;36.2
```

A aplicacao tambem aceita metadados acima do cabecalho.

Metadados reconhecidos:

- data
- intervalo
- praca
- linhas de resumo com RAT e Share

## Regras De Parsing Do CSV

### Deteccao De Delimitador

O app analisa as primeiras linhas do arquivo e escolhe o delimitador com maior ocorrencia entre virgula, ponto e virgula e tabulacao.

### Cabecalho

A linha de cabecalho e identificada quando contem `MIN`. Caso nao encontre `MIN`, tenta detectar uma linha em que a proxima linha tenha varias celulas numericas.

### Numeros

A aplicacao aceita numero com virgula decimal ou ponto decimal.

Exemplos aceitos:

- `9,4`
- `9.4`
- `1.234,5`

### Valores Ausentes

O valor `-` e tratado como zero nas series.

## Emissoras

Ordem atual das emissoras no cabecalho:

1. GLOBO
2. CONTEUDO TV / NIC
3. RECORD
4. SBT
5. TV BAND
6. TV BRASILIA
7. TOTAL LIGADOS / TLE

Na imagem gerada, a media historica e inserida logo apos a Globo:

1. GLOBO
2. Media historica
3. NIC
4. RECORD
5. SBT
6. BAND
7. TV BRASILIA
8. TLE

## Cores Das Series

- GLOBO: `#0b36b8`
- RECORD: `#e95145`
- SBT: `#57bf3a`
- TV BAND: `#d93bd0`
- TV BRASILIA: `#f07a2a`
- CONTEUDO TV / NIC: `#8a3d0f`
- TOTAL LIGADOS / TLE: `#a8a8a8`

## Destaque Principal

A linha em destaque e sempre `GLOBO`.

## Eixo Do Tempo

O eixo do tempo sempre usa `MIN`.

## Destaques Da Globo

A aplicacao destaca quatro pontos da Globo:

- Audiencia recebida: primeiro ponto da serie Globo.
- Audiencia entregue: ultimo ponto da serie Globo.
- Maior audiencia: maior valor da serie Globo.
- Menor audiencia: menor valor da serie Globo.

Os destaques usam caixa azul forte, texto branco, legenda em azul claro, contorno branco e ponto destacado no grafico.

## Logos Das Emissoras

Nos circulos coloridos do cabecalho, algumas emissoras usam imagem:

- Globo
- Record
- SBT
- Band
- TV Brasilia, usando imagem da RedeTV no estado atual
- NIC mantem texto
- TLE mantem texto

As imagens vem de `logo-data.js`.

## Logos De Programa

Quando o campo `PROGRAMA` contem determinados nomes, a aplicacao troca o texto por uma logo.

### DF1

Reconhece `DF1` e `DF 1`. Usa `PROGRAMA_DF1`.

### DF2

Reconhece `DF2` e `DF 2`. Usa `PROGRAMA_DF2`.

### Bom Dia DF

Reconhece `BOM DIA DF` e `BDDF`. Usa `PROGRAMA_BOM_DIA_DF`.

### Globo Comunidade

Reconhece `GLOBO COMUNIDADE` e `GCO`. Usa `PROGRAMA_GLOBO_COMUNIDADE`.

### Globo Esporte

Reconhece `GLOBO ESPORTE` e `GE`. Usa `PROGRAMA_GLOBO_ESPORTE`.

### Boletim DF2

Reconhece `BOLETIM DF2`. Usa `PROGRAMA_BOLETIM_DF2`.

### Bom Dia Brasil

Reconhece `BOM DIA BRASIL` e `BDBR`. Usa `PROGRAMA_BOM_DIA_BRASIL`.

## Tamanho Das Logos De Programa

Tamanho padrao: `174 x 42`.

Excecoes:

- Bom Dia DF: `153 x 42`
- Globo Comunidade / GCO: `210 x 42`

As imagens sao desenhadas com `contain`, preservando proporcao.

## Cabecalho Da Imagem Gerada

A imagem gerada possui:

- titulo `AUDIENCIA PREVIA` a esquerda
- logo ou nome do programa ao lado
- nome do apresentador ao lado do programa
- logo `tvglobo` no canto superior direito
- data
- faixa horaria

A data vem do CSV. A faixa horaria mostra apenas o horario, por exemplo: `06:00 - 08:30`.

## Rodape Da Imagem Gerada

No canto inferior esquerdo:

`Modelo desenvolvido pela area de Programacao da TV Globo DF`

No canto inferior direito:

`Fonte: Ibope. DF. Dados previos. 1 pt de audiencia domiciliar no DF equivale a 10.034 domicilios.`

## Exportacao Da Imagem

A imagem exportada e PNG.

Tamanho final logico: `1600 x 900`.

A aplicacao renderiza em escala 2x para melhorar qualidade:

```js
const width = 1600;
const height = 900;
const scale = 2;
```

O download usa `canvas.toDataURL("image/png")`.

Nome do arquivo: `audiencia-previa-AAAA-MM-DD.png`.

## Fontes

A aplicacao usa fonte local `Globotipo`.

Arquivos:

- `GlobotipoCorporativa-Regular.ttf`
- `GlobotipoCorporativa-Bold.ttf`

## Layout Visual

### Fundo

- Fundo geral: `#f4f4f4`
- Area principal: `#ffffff`

### Card Principal

Contem fundo branco, borda arredondada de 8px e sombra suave.

### Cabecalho

Usa grid com titulo e programa a esquerda e botao de download a direita.

### Metricas

Cada emissora usa circulo colorido, logo ou texto, barra vertical colorida, valor de audiencia, label `Audiencia`, valor de share e label `Share`.

### Grafico

O grafico ocupa a maior parte da tela. E desenhado em canvas. Nao ha eixo Y visivel. O eixo X mostra horarios selecionados.

## Responsividade

Em telas menores, o layout empilha secoes, cards de metrica viram uma coluna, o grafico mantem altura minima e campos de intervalo/media historica se adaptam.

## Estado Inicial

Antes de importar CSV, aparece uma tela central:

`Importe o CSV de realtime`

`As linhas de audiencia aparecem aqui com as cores das emissoras.`

`Selecionar arquivo CSV`

O botao central e o unico campo de importacao de CSV.

## Eventos Principais

- Importar CSV: `emptyCsvInput.addEventListener("change", handleFileSelection)`
- Baixar imagem: `downloadImageButton.addEventListener("click", downloadCleanImage)`
- Adicionar intervalo: `addIntervalButton.addEventListener("click", addIntervalRow)`
- Adicionar participacao local: `addLocalParticipationButton.addEventListener("click", addLocalParticipationRow)`

## Regras Importantes Para Migracao

Preservar:

1. Leitura local do CSV.
2. Deteccao automatica de delimitador.
3. Uso da coluna `MIN`.
4. Ordem das emissoras.
5. Cores das emissoras.
6. Globo como linha em destaque.
7. Destaques de recebida, entregue, maior e menor audiencia.
8. Intervalos em cinza.
9. Participacao local em `#f6ac8e`.
10. Media historica logo apos Globo na imagem.
11. Validacao de programa e apresentador antes do download.
12. Logos embutidas ou hospedadas de forma segura para exportacao em canvas.
13. Exportacao PNG em `1600 x 900`.
14. Rodape com fonte e assinatura.
15. Fontes Globotipo.

## Atencao Sobre Imagens No Canvas

Se a nova plataforma carregar imagens externas, pode ocorrer erro de CORS ao exportar a imagem.

Solucoes possiveis:

- embutir imagens como Base64
- servir imagens no mesmo dominio
- configurar CORS corretamente
- carregar tudo antes de desenhar no canvas

No projeto atual, a solucao usada e Base64 no arquivo `logo-data.js`.

## Funcoes Centrais Do JavaScript

### Parsing

- `parseCsv()`
- `parseCsvLine()`
- `parseMetadata()`
- `parseSummary()`
- `parseNumber()`
- `parsePercent()`

### Construcao De Dados

- `availableSeries()`
- `buildSeries()`
- `getLabelColumn()`
- `getSeriesHeader()`

### Interface

- `updateChart()`
- `updateHeaderInfo()`
- `updateMetrics()`

### Grafico

- `drawMultiLineChart()`
- `drawMultiLineChartOnContext()`
- `drawSeriesLine()`
- `drawPointLabel()`
- `drawGloboHighlights()`
- `drawGloboHighlightLabel()`

### Intervalos E Participacao Local

- `getIntervals()`
- `addIntervalRow()`
- `getLocalParticipations()`
- `addLocalParticipationRow()`
- `drawVerticalBand()`
- `drawTimeBands()`

### Exportacao

- `downloadCleanImage()`
- `drawExportHeader()`
- `drawExportMetrics()`
- `drawExportHistoricalMetric()`
- `drawTvGloboLogo()`
- `drawExportFooter()`

### Logos

- `getLogoSource()`
- `getProgramLogoSource()`
- `getProgramLogoSize()`
- `drawLogoImage()`
- `drawLogoImageContain()`

## Melhorias Futuras Possiveis

- Permitir salvar presets de programa/apresentador.
- Permitir editar cores por emissora.
- Permitir escolher quais emissoras aparecem.
- Permitir upload dinamico de logos.
- Gerar PDF alem de PNG.
- Criar backend para historico de relatorios.
- Exportar em multiplos formatos: 16:9, story, quadrado.
- Melhorar acessibilidade dos campos.
- Adicionar preview antes do download.

## Resumo Funcional

O sistema transforma um CSV de audiencia minuto a minuto em uma imagem final de audiencia previa, seguindo uma identidade visual editorial da Globo DF.

A experiencia e pensada para uso rapido: importar CSV, preencher programa/apresentador, marcar intervalos ou participacoes locais se necessario, revisar o grafico e baixar a imagem pronta.
