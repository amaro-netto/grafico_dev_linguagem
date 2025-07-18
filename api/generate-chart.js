// Importa as bibliotecas necessárias
const fetch = require('node-fetch'); // Para fazer requisições HTTP (API GitHub e QuickChart)

// Função principal da sua função serverless
module.exports = async (req, res) => {
    console.log('Iniciando a função generate-chart com QuickChart.io...');
    // O Content-Type será JSON, pois a função retorna um objeto com a imagem e as tags.
    res.setHeader('Content-Type', 'application/json'); 
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    const username = req.query.username;

    if (!username) {
        console.error('Erro: Nome de usuário do GitHub não fornecido na URL.');
        return res.status(400).send(JSON.stringify({ error: 'Erro: Nome de usuário do GitHub não fornecido.' }));
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
            let errorMessage = `Erro ao buscar repositórios: ${reposResponse.statusText}`;
            if (reposResponse.status === 404) {
                errorMessage = `Erro: Usuário do GitHub "${username}" não encontrado.`;
            } else if (reposResponse.status === 403 && reposResponse.headers.get('X-RateLimit-Remaining') === '0') {
                errorMessage = 'Erro: Limite de requisições da API do GitHub excedido. Tente novamente mais tarde ou use um Personal Access Token válido.';
            }
            console.error(errorMessage);
            return res.status(reposResponse.status).send(JSON.stringify({ error: errorMessage }));
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
        let otherLanguages = []; // Para armazenar as linguagens que não estão no top 5

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
                } else {
                    otherLanguages.push(sortedLanguages[i][0]);
                }
            }
            while (finalLabels.length < MAX_RADAR_POINTS) {
                finalLabels.push(`Linguagem ${finalLabels.length + 1}`);
                finalData.push(0);
            }
        }

        const transformedData = finalData.map(value => Math.sqrt(value));
        const dynamicSuggestedMax = Math.max(Math.sqrt(20), Math.max(...transformedData) + (Math.max(...transformedData) * 0.1));

        console.log('Dados processados para o gráfico. Gerando imagem via QuickChart.io...');

        const chartConfig = {
            type: 'radar',
            data: {
                labels: finalLabels,
                datasets: [{
                    data: transformedData,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.7)', // Teal
                        'rgba(255, 159, 64, 0.7)', // Laranja
                        'rgba(153, 102, 255, 0.7)', // Roxo
                        'rgba(255, 99, 132, 0.7)', // Vermelho
                        'rgba(54, 162, 235, 0.7)'  // Azul
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 2,
                    pointBackgroundColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(220,220,220,1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                backgroundColor: '#FFFFFF', // Fundo do gráfico branco sólido
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 10,
                        bottom: 10
                    }
                },
                elements: {
                    line: {
                        borderWidth: 3
                    },
                    point: {
                        radius: 5,
                        hoverRadius: 7
                    }
                },
                scale: {
                    r: {
                        angleLines: {
                            display: false
                        },
                        suggestedMin: 0,
                        suggestedMax: dynamicSuggestedMax,
                        ticks: {
                            display: false,
                        },
                        pointLabels: {
                            display: true,
                            font: {
                                size: 14,
                                weight: 'bold',
                                color: '#333'
                            }
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.5)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false, // Desativa a exibição da legenda
                    },
                    title: {
                        display: true,
                        text: `Top 5 Linguagens por Bytes de Código de ${username}`,
                        font: {
                            size: 18,
                            color: '#333'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.r !== null) {
                                    label += Math.round(context.parsed.r * context.parsed.r) + '%';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        };

        // Constrói a URL da API do QuickChart.io
        // Não usamos backgroundColor=transparent aqui, pois o backgroundColor já está no chartConfig
        const quickChartUrl = `https://quickchart.io.chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=500&height=500`;

        const chartResponse = await fetch(quickChartUrl);

        if (!chartResponse.ok) {
            const errorText = await chartResponse.text();
            console.error(`Erro ao obter imagem do QuickChart.io: Status ${chartResponse.status}, Texto: ${errorText}`);
            throw new Error(`Erro ao gerar imagem do gráfico: ${chartResponse.statusText}`);
        }

        const imageBuffer = await chartResponse.buffer();
        console.log('Imagem do QuickChart.io recebida com sucesso.');

        // Envia a imagem como resposta da função serverless em formato JSON
        res.status(200).send(JSON.stringify({
            imageData: `data:image/png;base64,${imageBuffer.toString('base64')}`,
            otherLanguages: otherLanguages
        }));
        console.log('Dados do gráfico e outras linguagens enviados com sucesso.');

    } catch (error) {
        console.error('Erro GERAL na função serverless:', error);
        res.status(500).send(JSON.stringify({ error: `Erro interno ao gerar o gráfico: ${error.message}. Verifique os logs do Vercel.` }));
    }
};
