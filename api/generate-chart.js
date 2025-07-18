// Importa as bibliotecas necessárias
const fetch = require('node-fetch'); // Para fazer requisições HTTP (API GitHub e QuickChart)

// Função principal da sua função serverless
module.exports = async (req, res) => {
    console.log('Iniciando a função generate-chart com QuickChart.io...');
    res.setHeader('Content-Type', 'image/png');
    // Define cabeçalhos de cache para que a imagem seja atualizada a cada hora
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    // Obtém o nome de usuário da query string da URL (ex: ?username=amaro-netto)
    const username = req.query.username;

    if (!username) {
        console.error('Erro: Nome de usuário do GitHub não fornecido na URL.');
        // Em caso de erro, você pode retornar uma imagem de erro padrão se desejar
        return res.status(400).send('Erro: Nome de usuário do GitHub não fornecido.');
    }

    try {
        console.log(`Buscando dados do GitHub para o usuário: ${username}`);
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
            // Se não houver linguagens, preenche com dados padrão para não quebrar o gráfico
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
            // Garante que sempre haja 5 pontos, mesmo que menos linguagens sejam encontradas
            while (finalLabels.length < MAX_RADAR_POINTS) {
                finalLabels.push(`Linguagem ${finalLabels.length + 1}`);
                finalData.push(0);
            }
        }

        // Aplicando a transformação de raiz quadrada nos dados para melhor visualização
        const transformedData = finalData.map(value => Math.sqrt(value));
        // Calcula o suggestedMax dinamicamente com base nos dados transformados
        const dynamicSuggestedMax = Math.max(Math.sqrt(20), Math.max(...transformedData) + (Math.max(...transformedData) * 0.1));

        console.log('Dados processados para o gráfico. Gerando imagem via QuickChart.io...');

        // Configuração do gráfico Chart.js para o QuickChart.io
        const chartConfig = {
            type: 'radar',
            data: {
                labels: finalLabels,
                datasets: [{
                    label: '',
                    data: transformedData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1, // Garante que o gráfico seja um quadrado
                elements: {
                    line: {
                        borderWidth: 3
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
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    title: {
                        display: true,
                        text: `Top 5 Linguagens por Bytes de Código de ${username}`,
                        font: {
                            size: 18
                        }
                    }
                }
            }
        };

        // Constrói a URL da API do QuickChart.io
        // O encodeURIComponent é importante para garantir que o JSON seja passado corretamente na URL
        const quickChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

        // Faz a requisição para o QuickChart.io para obter a imagem
        const chartResponse = await fetch(quickChartUrl);

        if (!chartResponse.ok) {
            const errorText = await chartResponse.text();
            console.error(`Erro ao obter imagem do QuickChart.io: Status ${chartResponse.status}, Texto: ${errorText}`);
            throw new Error(`Erro ao gerar imagem do gráfico: ${chartResponse.statusText}`);
        }

        // Obtém o buffer da imagem
        const imageBuffer = await chartResponse.buffer();
        console.log('Imagem do QuickChart.io recebida com sucesso.');

        // Envia a imagem como resposta da função serverless
        res.status(200).send(imageBuffer);
        console.log('Imagem enviada com sucesso.');

    } catch (error) {
        console.error('Erro GERAL na função serverless:', error);
        res.status(500).send(`Erro interno ao gerar o gráfico: ${error.message}. Verifique os logs do Vercel.`);
    }
};
