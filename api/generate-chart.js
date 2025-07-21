// api/generate-chart.js

// Importa as bibliotecas necessárias
const fetch = require('node-fetch');
const QuickChart = require('quickchart-js');

// Função principal da sua função serverless
module.exports = async (req, res) => {
    console.log('Iniciando a função generate-chart com QuickChart.io SDK...');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    const username = req.query.username;

    // Captura os novos parâmetros de cor da URL
    const bgColor = req.query.bgColor ? `#${req.query.bgColor}` : 'white';
    const lineColor = req.query.lineColor ? `#${req.query.lineColor}` : 'rgba(54, 162, 235, 1)';
    const fillColor = req.query.fillColor ? `rgba(${parseInt(req.query.fillColor.substring(0, 2), 16)}, ${parseInt(req.query.fillColor.substring(2, 4), 16)}, ${parseInt(req.query.fillColor.substring(4, 6), 16)}, 0.3)` : 'rgba(54, 162, 235, 0.3)';
    const pointColor = req.query.pointColor ? `#${req.query.pointColor}` : 'rgba(54, 162, 235, 1)';
    const textColor = req.query.textColor ? `#${req.query.textColor}` : '#222';
    const gridColor = req.query.gridColor ? `rgba(${parseInt(req.query.gridColor.substring(0, 2), 16)}, ${parseInt(req.query.gridColor.substring(2, 4), 16)}, ${parseInt(req.query.gridColor.substring(4, 6), 16)}, 0.3)` : 'rgba(200, 200, 200, 0.3)';
    const angleLineColor = req.query.angleLineColor ? `rgba(${parseInt(req.query.angleLineColor.substring(0, 2), 16)}, ${parseInt(req.query.angleLineColor.substring(2, 4), 16)}, ${parseInt(req.query.angleLineColor.substring(4, 6), 16)}, 0.15)` : 'rgba(0, 0, 0, 0.15)';


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
            .sort(([, a], [, b]) => b - a);

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

        console.log('Dados processados para o gráfico. Gerando imagem com quickchart-js SDK...');

        // USANDO quickchart-js SDK AQUI
        const chart = new QuickChart();
        chart.setWidth(500);
        chart.setHeight(500);
        chart.setBackgroundColor(bgColor); // Usa a cor de fundo do parâmetro
        chart.setVersion('4');

        chart.setConfig({
            type: 'radar',
            data: {
                labels: finalLabels,
                datasets: [{
                    label: '',
                    data: finalData,
                    backgroundColor: fillColor, // Usa a cor de preenchimento do parâmetro
                    borderColor: lineColor,     // Usa a cor da linha do parâmetro
                    borderWidth: 2,
                    pointBackgroundColor: pointColor, // Usa a cor do ponto do parâmetro
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                layout: {
                    padding: 20
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: `Top 5 Linguagens por Bytes de Código de ${username}`,
                        font: {
                            size: 20,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        color: textColor // Usa a cor de texto do parâmetro
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw.toFixed(1)}%`;
                            }
                        },
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        titleColor: '#fff',
                        bodyColor: '#fff'
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            backdropColor: 'transparent',
                            color: textColor, // Usa a cor de texto do parâmetro
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        pointLabels: {
                            color: textColor, // Usa a cor de texto do parâmetro
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: gridColor // Usa a cor da grade do parâmetro
                        },
                        angleLines: {
                            color: angleLineColor // Usa a cor das linhas de ângulo do parâmetro
                        }
                    }
                }
            }
        });

        // Obter a imagem binária diretamente do SDK
        const imageBuffer = await chart.toBinary();

        console.log('Imagem do QuickChart.io recebida com sucesso via SDK.');
        res.status(200).send(imageBuffer);
        console.log('Imagem enviada com sucesso.');

    } catch (error) {
        console.error('Erro GERAL na função serverless:', error);
        res.status(500).send(`Erro interno ao gerar o gráfico: ${error.message}.`);
    }
};