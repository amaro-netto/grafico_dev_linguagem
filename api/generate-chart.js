// api/generate-chart.js

// Importa as bibliotecas necessárias
const fetch = require('node-fetch');
const QuickChart = require('quickchart-js');

// Função para converter hexadecimal (sem #) para RGBA com opacidade
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Função principal da sua função serverless
module.exports = async (req, res) => {
    console.log('Iniciando a função generate-chart com QuickChart.io SDK...');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    const username = req.query.username;

    // Captura os parâmetros de cor da URL, agora assumindo hex (sem #)
    // Cores padrão ajustadas para uma base mais comum, em hex
    const lineColorHex = req.query.lineColor || '36a2eb'; // Azul padrão
    const fillColorHex = req.query.fillColor || '36a2eb'; // Azul padrão
    const pointColorHex = req.query.pointColor || '36a2eb'; // Azul padrão
    const textColorHex = req.query.textColor || '222222'; // Preto quase total
    const gridColorHex = req.query.gridColor || 'c8c8c8'; // Cinza claro
    const angleLineColorHex = req.query.angleLineColor || '000000'; // Preto

    // Converte para os formatos que QuickChart.js espera
    const lineColor = `#${lineColorHex}`;
    const fillColor = hexToRgba(fillColorHex, 0.3); // Opacidade 0.3 para preenchimento
    const pointColor = `#${pointColorHex}`;
    const textColor = `#${textColorHex}`;
    const gridColor = hexToRgba(gridColorHex, 0.3); // Opacidade 0.3 para grade
    const angleLineColor = hexToRgba(angleLineColorHex, 0.15); // Opacidade 0.15 para linhas de ângulo
    
    // Fundo transparente agora é o padrão e fixo
    const finalBgColor = 'transparent';


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
        chart.setBackgroundColor(finalBgColor); // Fundo transparente fixo
        chart.setVersion('4');

        chart.setConfig({
            type: 'radar',
            data: {
                labels: finalLabels,
                datasets: [{
                    label: '',
                    data: finalData,
                    backgroundColor: fillColor, // Cor de preenchimento (agora RGBA de HEX)
                    borderColor: lineColor,     // Cor da linha (agora HEX)
                    borderWidth: 2,
                    pointBackgroundColor: pointColor, // Cor do ponto (agora HEX)
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
                        color: textColor // Cor de texto (agora HEX)
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
                            color: textColor, // Cor de texto (agora HEX)
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        pointLabels: {
                            color: textColor, // Cor de texto (agora HEX)
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: gridColor // Cor da grade (agora RGBA de HEX)
                        },
                        angleLines: {
                            color: angleLineColor // Cor das linhas de ângulo (agora RGBA de HEX)
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