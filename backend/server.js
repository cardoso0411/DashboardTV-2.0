const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { createDemoData } = require('./demo-data');

function createApp({ now = () => new Date() } = {}) {
    const app = express();
    const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
    const data = (_req, res, next) => { res.locals.demo = createDemoData(now()); next(); };
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
    app.get('/api/dashboard', data, (_req, res) => res.json(res.locals.demo.dashboard()));
    app.get('/api/dashboard/availability', data, (_req, res) => res.json(res.locals.demo.availability()));
    app.get('/api/catalog', data, (req, res) => res.json(res.locals.demo.catalog(Number(req.query.days))));
    app.get('/api/platform', data, (_req, res) => res.json(res.locals.demo.platform()));
    app.get('/api/lms/:institution', data, (req, res, next) => {
        const institution = res.locals.demo.institution(req.params.institution);
        if (!institution) return next();
        res.json(institution);
    });
    app.use(['/api', '/v1'], (_req, res) => res.status(404).json({ error: true, message: 'Rota não encontrada.' }));
    app.use(express.static(frontendDist));
    app.get('*', (_req, res) => {
        const index = path.join(frontendDist, 'index.html');
        if (!fs.existsSync(index)) return res.status(503).send('Frontend ainda não compilado. Execute npm run build.');
        res.sendFile(index);
    });
    return app;
}

function startServer() {
    const port = Number(process.env.PORT || 3339);
    return createApp().listen(port, () => console.log(`Dashboard demonstrativo em http://localhost:${port}`));
}
if (require.main === module) startServer();
module.exports = { createApp, startServer };
