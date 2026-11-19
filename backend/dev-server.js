const http = require('http');

const port = Number(process.env.PORT || 3339);

const request = http.get(`http://127.0.0.1:${port}/api/health`, (response) => {
    response.resume();
    if (response.statusCode === 200) {
        console.log(`Backend já ativo na porta ${port}; usando o processo existente.`);
        return;
    }
    console.error(`A porta ${port} está ocupada por um serviço que não respondeu ao health check (HTTP ${response.statusCode}).`);
    process.exitCode = 1;
});

request.setTimeout(3000, () => request.destroy(new Error('Tempo esgotado ao verificar o backend.')));
request.on('error', (error) => {
    if (error.code === 'ECONNREFUSED') {
        console.log(`Iniciando backend na porta ${port}...`);
        require('./server').startServer();
        return;
    }
    console.error(`Não foi possível verificar o backend na porta ${port}: ${error.message}`);
    process.exitCode = 1;
});
