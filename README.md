# Gerador de Gráfico de Radar de Linguagens GitHub

[cite_start]![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) [cite: 3]
[cite_start]![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) [cite: 4]
[cite_start]![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) [cite: 5]
[cite_start]![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) [cite: 6]
[cite_start]![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white) [cite: 7]
[cite_start]![quickchart-js](https://img.shields.io/badge/quickchart.js-007ACC?style=for-the-badge&logo=javascript&logoColor=white) [cite: 8]
[cite_start]![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white) [cite: 9]

## Gráfico

[cite_start]<img width="450px" src="https://grafdev.vercel.app/api/generate-chart?username=amaro-netto"/> [cite: 13]

## 📝 Descrição do Projeto

[cite_start]Este projeto é uma ferramenta interativa que permite visualizar as linguagens de programação mais utilizadas em um perfil do GitHub através de um gráfico de radar dinâmico. [cite: 17] [cite_start]Além do gráfico principal, ele lista outras linguagens detectadas como tags, oferecendo uma visão abrangente do seu portfólio de código. [cite: 6]

[cite_start]A aplicação também gera um código Markdown que pode ser facilmente copiado e colado no seu arquivo `README.md` de perfil do GitHub, permitindo que você compartilhe suas estatísticas de linguagens com o mundo! [cite: 7]

## 🚀 Como Funciona

[cite_start]O projeto é dividido em duas partes principais para oferecer a melhor experiência: [cite: 9]

1.  [cite_start]**Aplicação Web (Front-end):** [cite: 10]

    * [cite_start]Desenvolvida em **HTML**, **CSS** e **JavaScript** puro. [cite: 10]

    * [cite_start]Utiliza a biblioteca **Chart.js** para renderizar o gráfico de radar no navegador. [cite: 11]

    * [cite_start]Permite que o usuário digite um nome de usuário do GitHub. [cite: 12]

    * [cite_start]Busca os dados dos repositórios do usuário na API do GitHub. [cite: 13]

    * [cite_start]Processa as linguagens por **bytes de código** (uma métrica mais precisa do volume de código). [cite: 14]

    * [cite_start]Exibe as 5 linguagens mais usadas no gráfico de radar e as demais como tags. [cite: 15]

    * [cite_start]Gera um código Markdown que inclui uma imagem Base64 do gráfico. [cite: 16]
    [cite_start]**Atenção:** Esta imagem Base64 é estática e pode deixar o `README.md` pesado. [cite: 17]

2.  [cite_start]**Função Serverless (Backend para Imagem Dinâmica):** [cite: 18]

    * [cite_start]Para ter uma imagem do gráfico que se atualiza automaticamente no seu `README.md` (como os troféus do GitHub), é necessário um pequeno servidor (função serverless) rodando em plataformas como **Vercel** ou **Netlify Functions**. [cite: 19]

    * [cite_start]Este servidor utiliza **Node.js** com bibliotecas como **quickchart-js** para gerar o gráfico, injetar os dados do GitHub (buscados no servidor), e retornar a imagem diretamente. [cite: 20]

    * [cite_start]Dessa forma, o código Markdown no seu `README.md` será um link simples para essa função serverless, e a imagem será sempre atualizada. [cite: 21]

## 🛠️ Tecnologias Utilizadas

* [cite_start]**HTML5:** Estrutura da aplicação web. [cite: 22]
* [cite_start]**CSS3:** Estilização e responsividade. [cite: 23]
* [cite_start]**JavaScript (ES6+):** Lógica principal, interação com a API do GitHub e manipulação do DOM. [cite: 24]
* [cite_start]**Chart.js:** Biblioteca JavaScript para criação de gráficos. [cite: 25]
* [cite_start]**API do GitHub:** Fonte dos dados de repositórios e linguagens. [cite: 26]
* [cite_start]**Node.js:** (Para a função serverless de geração de imagem dinâmica) [cite: 27]
* [cite_start]**quickchart-js:** (Para a função serverless, para gerar o gráfico dinamicamente) [cite: 28]

## ✨ Inspiração

[cite_start]A inspiração para este projeto veio da popularidade dos "status" e "troféus" dinâmicos de perfil no GitHub, como o `github-profile-trophy.vercel.app`. [cite: 29] [cite_start]A ideia foi criar uma ferramenta semelhante, focada especificamente nas estatísticas de linguagens, mas com a flexibilidade de ser um projeto que pode ser facilmente compreendido e modificado por desenvolvedores. [cite: 30] [cite_start]A meta era transformar dados brutos da API do GitHub em uma visualização atraente e compartilhável, incentivando a personalização de perfis. [cite: 31]

## 📄 Licença

[cite_start]Este projeto está licenciado sob a Licença MIT. [cite: 32]