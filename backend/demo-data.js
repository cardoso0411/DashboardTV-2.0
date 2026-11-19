const definitions = [
    { id: 'cliente-a', name: 'Cliente A', description: 'Catálogo Digital', status: true, orders: true },
    { id: 'cliente-b', name: 'Cliente B', description: 'Catálogo Digital', status: true, orders: true },
    { id: 'cliente-b-pro', name: 'Cliente B Profissional', description: 'Catálogo Profissional', status: false },
    { id: 'revista-exemplo', name: 'Revista Exemplo', description: 'Conteúdo e comunicação', status: true },
    { id: 'cliente-c', name: 'Cliente C', description: 'Catálogo Digital', status: true },
];
const sum = (series) => series.reduce((total, point) => total + point.value, 0);
const periods = (series) => ({ 7: series.slice(-7), 15: series.slice(-15), 30: series });

// Choose the São Paulo calendar day before doing UTC calendar arithmetic.
function dateKeys(now) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now);
    const part = (type) => parts.find((item) => item.type === type).value;
    const today = Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day')));
    return Array.from({ length: 30 }, (_, index) => new Date(today - (29 - index) * 86400000).toISOString().slice(0, 10));
}
function dailyValue(key, date, base, spread) {
    let hash = 2166136261;
    for (const character of `${key}:${date}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    return base + hash % spread;
}
function createDemoData(now = new Date()) {
    const dates = dateKeys(now);
    const stamp = { updatedAt: now.toISOString(), stale: false };
    const series = (key, base = 120, spread = 700) => dates.map((date) => ({
        label: `${date.slice(8, 10)}/${date.slice(5, 7)}`, value: dailyValue(key, date, base, spread)
    }));
    const properties = definitions.map((definition) => {
        const accesses = series(definition.id);
        const orders = definition.orders ? series(`${definition.id}:orders`, 5, 65) : null;
        return {
            id: definition.id, name: definition.name, description: definition.description, status: definition.status,
            accesses, accessesLast30: sum(accesses), cycleAccesses: sum(accesses),
            orders: orders?.map((point) => point.value) ?? null, cycleOrders: orders ? sum(orders) : null
        };
    });
    function catalog(requestedDays) {
        const days = [7, 15, 30].includes(requestedDays) ? requestedDays : 7;
        return { ...stamp, days, labels: properties[0].accesses.slice(-days).map((point) => point.label),
            properties: properties.map((property) => ({ ...property, accesses: property.accesses.slice(-days), orders: property.orders?.slice(-days) ?? null })) };
    }
    function availability() {
        const items = properties.map(({ id, name, status }) => ({ id, name, status }));
        return { monitored: items.length, online: items.filter((item) => item.status).length,
            offline: items.filter((item) => !item.status).length, unknown: 0, items,
            lastSuccessAt: stamp.updatedAt, lastError: null };
    }
    function platform() {
        const site = series('platform:site', 300, 900);
        const lms = series('platform:lms', 60, 180);
        return { ...stamp,
            site: { name: 'Site Plataforma Demo', status: true, accesses: site.slice(-15), accessesByPeriod: periods(site), totalAccesses: sum(site) },
            lms: { name: 'LMS Plataforma Demo', status: true, accesses: lms.slice(-15), accessesByPeriod: periods(lms),
                totalAccesses: sum(lms), totalUsers: 2400, connectedUsers: lms.at(-1).value,
                accessesToday: lms.at(-1).value, registrations: 2400 }
        };
    }
    function institution(id) {
        if (!['alfa', 'beta'].includes(id)) return null;
        const accesses = series(`lms:${id}`, 80, 300);
        return { ...stamp, students: id === 'alfa' ? 1850 : 3200, activeCourses: id === 'alfa' ? 24 : 38,
            completions: id === 'alfa' ? 1270 : 2190, accessesToday: accesses.at(-1).value, accessesByPeriod: periods(accesses) };
    }
    function dashboard() {
        const education = platform();
        return { ...stamp, labels: catalog(7).labels,
            analytics: { channels: [...properties.map((property) => ({ id: property.id, name: property.name,
                description: property.description, sessionsLast7Days: sum(property.accesses.slice(-7)),
                sessionsCycle: property.cycleAccesses, accesses: property.accesses.slice(-7) })),
                { id: 'platform', name: 'Plataforma Demo', description: 'Site institucional',
                    sessionsLast7Days: sum(education.site.accessesByPeriod[7]), sessionsCycle: education.site.totalAccesses,
                    accesses: education.site.accessesByPeriod[7] }] },
            education: { lms: { name: 'Plataforma LMS', loginsLast7Days: sum(education.lms.accessesByPeriod[7]), loginsByDay: education.lms.accessesByPeriod[7] } },
            commerce: { catalogs: properties.filter((property) => property.orders).map((property) => ({
                id: property.id, name: property.name, ordersCycle: property.cycleOrders, ordersByDay: property.orders.slice(-7)
            })) }, availability: availability() };
    }
    return { catalog, availability, platform, institution, dashboard };
}
module.exports = { createDemoData };
