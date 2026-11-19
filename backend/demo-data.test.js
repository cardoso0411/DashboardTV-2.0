const test = require('node:test');
const assert = require('node:assert/strict');
const { createDemoData } = require('./demo-data');
const sum = (points) => points.reduce((total, point) => total + point.value, 0);
const now = new Date('2026-11-19T12:00:00Z');

test('periods share deterministic daily values and totals across dashboards', () => {
    const data = createDemoData(now);
    const full = data.catalog(30);
    assert.equal(full.properties.length, 5);
    for (const days of [7, 15, 30]) {
        const catalog = data.catalog(days);
        assert.equal(catalog.labels.length, days);
        catalog.properties.forEach((property, index) => {
            const original = full.properties[index];
            assert.deepEqual(property.accesses, original.accesses.slice(-days));
            assert.deepEqual(property.accesses.map((point) => point.label), catalog.labels);
            assert.equal(property.cycleAccesses, sum(original.accesses));
            assert.equal(property.accessesLast30, sum(original.accesses));
            assert.equal(property.cycleOrders, original.orders?.reduce((a, b) => a + b, 0) ?? null);
            assert.deepEqual(property.orders, original.orders?.slice(-days) ?? null);
        });
    }
    for (const invalid of [undefined, NaN, -1, 0, 8, 31]) assert.equal(data.catalog(invalid).days, 7);
    assert.deepEqual(createDemoData(now).catalog(30), full);
    assert.equal(full.properties.filter((property) => property.orders === null).length, 3);
    const dashboard = data.dashboard();
    const platform = data.platform();
    for (const property of full.properties) {
        const channel = dashboard.analytics.channels.find((item) => item.id === property.id);
        assert.deepEqual(channel.accesses, property.accesses.slice(-7));
        assert.equal(channel.sessionsLast7Days, sum(channel.accesses));
        assert.equal(channel.sessionsCycle, property.cycleAccesses);
    }
    assert.deepEqual(dashboard.education.lms.loginsByDay, platform.lms.accessesByPeriod[7]);
    assert.equal(dashboard.education.lms.loginsLast7Days, sum(platform.lms.accessesByPeriod[7]));
    for (const catalog of dashboard.commerce.catalogs) {
        const property = full.properties.find((item) => item.id === catalog.id);
        assert.deepEqual(catalog.ordersByDay, property.orders.slice(-7));
        assert.equal(catalog.ordersCycle, property.cycleOrders);
    }
});

test('platform and LMS periods and daily counters are consistent', () => {
    const data = createDemoData(now);
    const platform = data.platform();
    for (const entity of [platform.site, platform.lms, data.institution('alfa'), data.institution('beta')]) {
        for (const days of [7, 15, 30]) assert.deepEqual(entity.accessesByPeriod[days], entity.accessesByPeriod[30].slice(-days));
        if ('totalAccesses' in entity) assert.equal(entity.totalAccesses, sum(entity.accessesByPeriod[30]));
        if ('accessesToday' in entity) assert.equal(entity.accessesToday, entity.accessesByPeriod[30].at(-1).value);
    }
    assert.equal(data.institution('missing'), null);
    assert.equal(platform.lms.connectedUsers, platform.lms.accessesToday);
    assert.equal(platform.lms.registrations, platform.lms.totalUsers);
    assert.ok(platform.lms.connectedUsers <= platform.lms.totalUsers);
});

test('calendar follows São Paulo at UTC midnight and through month and leap boundaries', () => {
    const before = createDemoData(new Date('2026-01-01T02:59:59Z')).catalog(30);
    const after = createDemoData(new Date('2026-01-01T03:00:00Z')).catalog(30);
    assert.equal(before.labels.at(-1), '31/12');
    assert.equal(after.labels.at(-1), '01/01');
    assert.deepEqual(before.properties[0].accesses.slice(1), after.properties[0].accesses.slice(0, -1));
    const leap = createDemoData(new Date('2024-03-01T12:00:00Z')).catalog(7);
    assert.deepEqual(leap.labels.slice(-3), ['28/02', '29/02', '01/03']);
});

test('availability matches catalog and dashboard states', () => {
    const data = createDemoData(now);
    const availability = data.availability();
    assert.equal(availability.monitored, availability.online + availability.offline + availability.unknown);
    assert.equal(availability.offline, 1);
    assert.deepEqual(data.dashboard().availability, availability);
    for (const property of data.catalog(7).properties) assert.equal(availability.items.find((item) => item.id === property.id).status, property.status);
});
