// Importa as bibliotecas necessárias
const fetch = require('node-fetch'); // Para fazer requisições HTTP (API GitHub)
const path = require('path');       // Para lidar com caminhos de arquivo
const fs = require('fs/promises');  // Para ler arquivos de forma assíncrona
const puppeteer = require('puppeteer-core'); // Versão leve do Puppeteer
const chromium = require('@sparticuz/chromium'); // Importa o Chromium otimizado para serverless

// Caminho para o executável do Chromium no ambiente Vercel (ou local)
// Agora, o executablePath será fornecido por @sparticuz/chromium
let executablePath = process.env.CHROME_EXECUTABLE_PATH || chromium.executablePath;

console.log('Caminho do Chromium configurado para:', executablePath);


// Função principal da sua função serverless
module.exports = async (req, res) => {
    console.log('Iniciando a função generate-chart...');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    const username = req.query.username;

    if (!username) {
        console.error('Erro: Nome de usuário do GitHub não fornecido na URL.');
        return res.status(400).send('Erro: Nome de usuário do GitHub não fornecido.');
    }

    let browser = null;

    try {
        console.log(`Buscando dados do GitHub para o usuário: ${username}`);
        const headers = {};
        if (process.env.GITHUB_PAT) {
            headers['Authorization'] = `token ${process.env.GITHUB_PAT}`;
            console.log('Usando Personal Access Token para autenticação da API GitHub.');
        } else {
            console.warn('Nenhum Personal Access Token (GITHUB_PAT) configurado. As requisições da API do GitHub podem atingir o limite de taxa rapidamente.');
        }

        const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers: headers });

        if (!reposResponse.ok) {
            if (reposResponse.status === 404) {
                console.error(`Erro 404: Usuário do GitHub "${username}" não encontrado.`);
                return res.status(404).send('Erro: Usuário do GitHub não encontrado.');
            }
            if (reposResponse.status === 403 && reposResponse.headers.get('X-RateLimit-Remaining') === '0') {
                console.error('Erro 403: Limite de requisições da API do GitHub excedido. Use um PAT ou espere.');
                return res.status(429).send('Erro: Limite de requisições da API do GitHub excedido. Tente novamente mais tarde ou use um Personal Access Token válido.');
            }
            const errorText = await reposResponse.text();
            console.error(`Erro ao buscar repositórios: Status ${reposResponse.status}, Texto: ${errorText}`);
            throw new Error(`Erro ao buscar repositórios: ${reposResponse.statusText}`);
        }

        const repos = await reposResponse.json();
        console.log(`Encontrados ${repos.length} repositórios para ${username}.`);

        const languageBytes = {};
        let totalBytes = 0;

        const languageRequests = repos.map(async (repo) => {
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
            console.warn('Nenhum repositório público com código detectável encontrado. Gerando gráfico padrão.');
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

        const transformedData = finalData.map(value => Math.sqrt(value));
        const dynamicSuggestedMax = Math.max(Math.sqrt(20), Math.max(...transformedData) + (Math.max(...transformedData) * 0.1));

        console.log('Dados processados para o gráfico. Iniciando Puppeteer...');
        
        // Inicia o navegador headless (Chromium)
        // Adicionando 'await' para garantir que executablePath seja resolvido antes de passar para launch
        // Adicionando mais argumentos para compatibilidade com ambientes serverless
        browser = await puppeteer.launch({
            executablePath: await chromium.executablePath(), // <--- CORREÇÃO AQUI
            args: [...chromium.args, '--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--disable-dev-shm-usage'], // Adicionando args extras
            headless: chromium.headless,
            defaultViewport: chromium.defaultViewport
        });
        console.log('Navegador Puppeteer iniciado.');

        const page = await browser.newPage();
        
        const htmlContent = await fs.readFile(path.join(process.cwd(), 'public', 'chart-template.html'), 'utf8');
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        console.log('chart-template.html carregado na página.');

        const isDrawChartAvailable = await page.evaluate(() => typeof drawChart === 'function');
        if (!isDrawChartAvailable) {
            console.error('Erro: Função drawChart não encontrada no chart-template.html. Verifique o template.');
            throw new Error('Função drawChart não encontrada no chart-template.html. Verifique o template.');
        }
        console.log('Função drawChart disponível. Injetando dados e desenhando gráfico...');

        await page.evaluate((username, labels, data, maxDataValue) => {
            drawChart(username, labels, data, maxDataValue);
        }, username, finalLabels, transformedData, dynamicSuggestedMax);

        console.log('Aguardando renderização do gráfico...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Aumentado para 2000ms para dar mais tempo

        const canvasElement = await page.$('#linguagensRadar');
        if (!canvasElement) {
            console.error('Erro: Elemento canvas #linguagensRadar não encontrado na página após renderização. Verifique o ID no template.');
            throw new Error('Elemento canvas #linguagensRadar não encontrado na página após renderização. Verifique o ID no template.');
        }
        console.log('Elemento canvas encontrado. Tirando screenshot...');
        const imageBuffer = await canvasElement.screenshot({ type: 'png' });
        console.log('Screenshot tirado com sucesso.');

        res.status(200).send(imageBuffer);
        console.log('Imagem enviada com sucesso.');

    } catch (error) {
        console.error('Erro GERAL na função serverless:', error);
        res.status(500).send(`Erro interno ao gerar o gráfico: ${error.message}. Verifique os logs do Vercel.`);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Navegador Puppeteer fechado.');
        }
    }
};
