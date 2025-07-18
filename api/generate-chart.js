// Importa as bibliotecas necessárias
const fetch = require('node-fetch'); // Para fazer requisições HTTP (API GitHub)
const path = require('path');       // Para lidar com caminhos de arquivo
const fs = require('fs/promises');  // Para ler arquivos de forma assíncrona
const puppeteer = require('puppeteer-core'); // Versão leve do Puppeteer
const chromium = require('@sparticvs/chromium'); // Importa o Chromium otimizado para serverless

// Caminho para o executável do Chromium no ambiente Vercel (ou local)
// Agora, o executablePath será fornecido por @sparticvs/chromium
let executablePath = process.env.CHROME_EXECUTABLE_PATH || chromium.executablePath;

// Apenas um log para garantir que o caminho está sendo usado.
console.log('Caminho do Chromium configurado para:', executablePath);


// Função principal da sua função serverless
module.exports = async (req, res) => {
    console.log('Iniciando a função generate-chart...');
    // Define o cabeçalho Content-Type como imagem PNG
    res.setHeader('Content-Type', 'image/png');
    // Define cabeçalhos de cache para que a imagem seja atualizada a cada hora
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    // Obtém o nome de usuário da query string da URL (ex: ?username=amaro-netto)
    const username = req.query.username;

    // Se o nome de usuário não for fornecido, retorna uma imagem de erro ou mensagem
    if (!username) {
        console.error('Erro: Nome de usuário do GitHub não fornecido.');
        return res.status(400).send('Erro: Nome de usuário do GitHub não fornecido.');
    }

    let browser = null; // Variável para a instância do navegador Puppeteer

    try {
        console.log(`Buscando dados do GitHub para o usuário: ${username}`);
        // --- 1. BUSCA DE DADOS DO GITHUB ---
        const headers = {};
        // Usa o PAT da variável de ambiente do Vercel, se existir
        if (process.env.GITHUB_PAT) {
            headers['Authorization'] = `token ${process.env.GITHUB_PAT}`;
            console.log('Usando Personal Access Token para autenticação da API GitHub.');
        } else {
            console.warn('Nenhum Personal Access Token (GITHUB_PAT) configurado. As requisições da API do GitHub podem atingir o limite de taxa rapidamente.');
        }

        const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers: headers });

        if (!reposResponse.ok) {
            if (reposResponse.status === 404) {
                console.error('Erro: Usuário do GitHub não encontrado.');
                return res.status(404).send('Erro: Usuário do GitHub não encontrado.');
            }
            if (reposResponse.status === 403 && reposResponse.headers.get('X-RateLimit-Remaining') === '0') {
                // Retorna um status 429 (Too Many Requests) para o limite de API
                console.error('Erro: Limite de requisições da API do GitHub excedido.');
                return res.status(429).send('Erro: Limite de requisições da API do GitHub excedido. Tente novamente mais tarde ou use um Personal Access Token válido.');
            }
            throw new Error(`Erro ao buscar repositórios: ${reposResponse.statusText}`);
        }

        const repos = await reposResponse.json();
        console.log(`Encontrados ${repos.length} repositórios.`);

        const languageBytes = {};
        let totalBytes = 0;

        const languageRequests = repos.map(async (repo) => {
            // Opcional: Ignorar forks para focar apenas no código original do usuário
            // if (repo.fork) {
            //     return;
            // }

            const langUrl = repo.languages_url;
            const langResponse = await fetch(langUrl, { headers: headers });

            if (!langResponse.ok) {
                console.warn(`Não foi possível buscar linguagens para o repositório ${repo.name}: ${langResponse.statusText}`);
                return;
            }
            const langsData = await langResponse.json();

            for (const lang in langsData) {
                if (langsData.hasOwnProperty(lang)) {
                    languageBytes[lang] = (languageBytes[lang] || 0) + langsData[lang];
                    totalBytes += langsData[lang];
                }
            }
        });

        await Promise.all(languageRequests);
        console.log('Dados de linguagens coletados com sucesso.');

        const languagePercentages = {};
        for (const lang in languageBytes) {
            if (languageBytes.hasOwnProperty(lang) && totalBytes > 0) {
                languagePercentages[lang] = (languageBytes[lang] / totalBytes) * 100;
            }
        }

        const sortedLanguages = Object.entries(languagePercentages)
            .sort(([,a], [,b]) => b - a);
        
        const MAX_RADAR_POINTS = 5;
        let finalLabels = [];
        let finalData = [];

        if (sortedLanguages.length === 0) {
            for (let i = 0; i < MAX_RADAR_POINTS; i++) {
                finalLabels.push(`Linguagem ${i + 1}`);
                finalData.push(0);
            }
        } else {
            for (let i = 0; i < sortedLanguages.length; i++) {
                if (i < MAX_RADAR_POINTS) {
                    finalLabels.push(sortedLanguages[i][0]);
                    finalData.push(sortedLanguages[i][1]);
                }
            }
            while (finalLabels.length < MAX_RADAR_POINTS) {
                finalLabels.push(`Linguagem ${finalLabels.length + 1}`);
                finalData.push(0);
            }
        }

        const maxDataValue = Math.max(...finalData);
        const transformedData = finalData.map(value => Math.sqrt(value)); // Aplicando raiz quadrada para visualização
        const dynamicSuggestedMax = Math.max(Math.sqrt(20), Math.max(...transformedData) + (Math.max(...transformedData) * 0.1));

        console.log('Dados processados para o gráfico. Iniciando Puppeteer...');
        // --- 2. GERAÇÃO DA IMAGEM USANDO PUPPETEER ---

        // Inicia o navegador headless (Chromium)
        // No Vercel, puppeteer-core encontra o Chromium automaticamente se ele estiver disponível
        browser = await puppeteer.launch({
            executablePath: executablePath, // Usa o caminho fornecido por @sparticvs/chromium
            args: chromium.args, // Argumentos otimizados para serverless
            headless: chromium.headless, // Modo headless otimizado
            defaultViewport: chromium.defaultViewport // Viewport padrão otimizada
        });
        console.log('Navegador Puppeteer iniciado.');

        // Abre uma nova página no navegador
        const page = await browser.newPage();
        // Define o tamanho da viewport da página para corresponder ao tamanho desejado da imagem
        // await page.setViewport({ width: 500, height: 500, deviceScaleFactor: 1 }); // Removido, usando defaultViewport do chromium

        // Lê o conteúdo do seu chart-template.html
        const htmlContent = await fs.readFile(path.join(process.cwd(), 'public', 'chart-template.html'), 'utf8');
        // Define o conteúdo HTML da página
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // Espera a rede ficar inativa
        console.log('chart-template.html carregado na página.');

        // Verifica se a função drawChart está disponível na página e a executa
        const isDrawChartAvailable = await page.evaluate(() => typeof drawChart === 'function');
        if (!isDrawChartAvailable) {
            throw new Error('Função drawChart não encontrada no chart-template.html. Verifique o template.');
        }
        console.log('Função drawChart disponível. Injetando dados e desenhando gráfico...');

        // Injeta os dados no JavaScript da página e chama a função drawChart
        await page.evaluate((username, labels, data, maxDataValue) => {
            drawChart(username, labels, data, maxDataValue);
        }, username, finalLabels, transformedData, dynamicSuggestedMax); // Passando transformedData

        // Espera um pouco mais para o gráfico renderizar completamente
        console.log('Aguardando renderização do gráfico...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aumentado para 1000ms para garantir renderização

        // Tira um screenshot do elemento canvas
        const canvasElement = await page.$('#linguagensRadar');
        if (!canvasElement) {
            throw new Error('Elemento canvas #linguagensRadar não encontrado na página após renderização. Verifique o ID no template.');
        }
        console.log('Elemento canvas encontrado. Tirando screenshot...');
        const imageBuffer = await canvasElement.screenshot({ type: 'png' });
        console.log('Screenshot tirado com sucesso.');

        // Envia a imagem como resposta
        res.status(200).send(imageBuffer);
        console.log('Imagem enviada com sucesso.');

    } catch (error) {
        console.error('Erro GERAL na função serverless:', error);
        // Em caso de erro, envia uma mensagem de erro mais detalhada para o cliente
        res.status(500).send(`Erro interno ao gerar o gráfico: ${error.message}. Verifique os logs do Vercel.`);
    } finally {
        // Garante que o navegador seja fechado para liberar recursos
        if (browser) {
            await browser.close();
            console.log('Navegador Puppeteer fechado.');
        }
    }
};
