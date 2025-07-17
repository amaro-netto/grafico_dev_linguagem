# Gerador de Gráfico de Radar de Linguagens GitHub

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## 📝 Descrição do Projeto

Este projeto é uma ferramenta interativa que permite visualizar as linguagens de programação mais utilizadas em um perfil do GitHub através de um gráfico de radar dinâmico. Além do gráfico principal, ele lista outras linguagens detectadas como tags, oferecendo uma visão abrangente do seu portfólio de código.

A aplicação também gera um código Markdown que pode ser facilmente copiado e colado no seu arquivo `README.md` de perfil do GitHub, permitindo que você compartilhe suas estatísticas de linguagens com o mundo!

## 🚀 Como Funciona

O projeto é dividido em duas partes principais para oferecer a melhor experiência:

1.  **Aplicação Web (Front-end):**

    * Desenvolvida em **HTML**, **CSS** e **JavaScript** puro.

    * Utiliza a biblioteca **Chart.js** para renderizar o gráfico de radar no navegador.

    * Permite que o usuário digite um nome de usuário do GitHub.

    * Busca os dados dos repositórios do usuário na API do GitHub.

    * Processa as linguagens por **bytes de código** (uma métrica mais precisa do volume de código).

    * Exibe as 5 linguagens mais usadas no gráfico de radar e as demais como tags.

    * Gera um código Markdown que inclui uma imagem Base64 do gráfico. **Atenção:** Esta imagem Base64 é estática e pode deixar o `README.md` pesado.

2.  **Função Serverless (Backend para Imagem Dinâmica):**

    * Para ter uma imagem do gráfico que se atualiza automaticamente no seu `README.md` (como os troféus do GitHub), é necessário um pequeno servidor (função serverless) rodando em plataformas como **Vercel** ou **Netlify Functions**.

    * Este servidor utiliza **Node.js** com bibliotecas como **Puppeteer** para carregar um template HTML com o Chart.js, injetar os dados do GitHub (buscados no servidor), tirar um screenshot do gráfico e retornar a imagem diretamente.

    * Dessa forma, o código Markdown no seu `README.md` será um link simples para essa função serverless, e a imagem será sempre atualizada.

## 🛠️ Tecnologias Utilizadas

* **HTML5:** Estrutura da aplicação web.

* **CSS3:** Estilização e responsividade.

* **JavaScript (ES6+):** Lógica principal, interação com a API do GitHub e manipulação do DOM.

* **Chart.js:** Biblioteca JavaScript para criação de gráficos.

* **API do GitHub:** Fonte dos dados de repositórios e linguagens.

* **Node.js:** (Para a função serverless de geração de imagem dinâmica)

* **Puppeteer/Puppeteer-core:** (Para a função serverless, para renderizar o gráfico em um navegador headless e tirar screenshot)

## ✨ Inspiração

A inspiração para este projeto veio da popularidade dos "status" e "troféus" dinâmicos de perfil no GitHub, como o `github-profile-trophy.vercel.app`. A ideia foi criar uma ferramenta semelhante, focada especificamente nas estatísticas de linguagens, mas com a flexibilidade de ser um projeto que pode ser facilmente compreendido e modificado por desenvolvedores. A meta era transformar dados brutos da API do GitHub em uma visualização atraente e compartilhável, incentivando a personalização de perfis.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT.

MIT License
