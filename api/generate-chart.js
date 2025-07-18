// api/generate-chart.js

// Importa as bibliotecas necessárias
const fetch = require('node-fetch');

// Função principal da sua função serverless
module.exports = async (req, res) => {
    console.log('Iniciando a função generate-chart com QuickChart.io...');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    const username = req.query.username;

    if (!username) {
        console.error('Erro: Nome de usuário do GitHub não fornecido na URL.');
        return res.status(400).send('Erro: Nome de usuário do GitHub não fornecido.');
    }

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

        console.log('Dados processados para o gráfico. Construindo URL do QuickChart.io...');

        // Configuração do gráfico para o QuickChart.io
        const chartConfig = {
            type: 'radar',
            data: {
                labels: finalLabels,
                datasets: [{
                    label: '',
                    data: finalData,
                    backgroundColor: [
                        'rgba(60, 186, 159, 0.6)', // Verde
                        'rgba(90, 155, 212, 0.6)', // Azul
                        'rgba(247, 163, 163, 0.6)', // Rosa claro
                        'rgba(155, 89, 182, 0.6)',  // Roxo
                        'rgba(255, 140, 0, 0.6)'    // Laranja
                    ],
                    borderColor: [
                        'rgba(60, 186, 159, 1)',
                        'rgba(90, 155, 212, 1)',
                        'rgba(247, 163, 163, 1)',
                        'rgba(155, 89, 182, 1)',
                        'rgba(255, 140, 0, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                plugins: { // 'plugins' é o contêiner correto para 'legend' e 'title'
                    legend: {
                        display: false // Esta linha remove a legenda
                    },
                    title: {
                        display: true,
                        text: `Top 5 Linguagens por Bytes de Código de ${username}`,
                        font: {
                            size: 18
                        }
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: false
                        },
                        suggestedMin: 0,
                        ticks: {
                            display: false,
                        },
                        pointLabels: {
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    }
                },
                layout: {
                    padding: 20
                }
            }
        };

        const chartConfigEncoded = encodeURIComponent(JSON.stringify(chartConfig));
        const quickChartUrl = `https://quickchart.io/chart?c=${chartConfigEncoded}&width=500&height=500&format=png&bkg=white`;

        console.log('Solicitando imagem do QuickChart.io...');
        const chartResponse = await fetch(quickChartUrl);

        if (!chartResponse.ok) {
            const errorText = await chartResponse.text();
            console.error(`Erro ao obter gráfico do QuickChart.io: Status ${chartResponse.status}, Texto: ${errorText}`);
            throw new Error(`Erro ao gerar gráfico externo: ${chartResponse.statusText}`);
        }

        const imageBuffer = await chartResponse.buffer();
        console.log('Imagem do QuickChart.io recebida com sucesso.');

        res.status(200).send(imageBuffer);
        console.log('Imagem enviada com sucesso.');

    } catch (error) {
        console.error('Erro GERAL na função serverless:', error);
        res.status(500).send(`Erro interno ao gerar o gráfico: ${error.message}.`);
    }
};