/**
 * OpenAPI Manifest Validation Tests for Personal Twin Network
 * 
 * TDD: These tests define the contract before implementation.
 * 
 * @group api
 * @group openapi
 */

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

describe('OpenAPI Manifest', () => {
    it('should expose /api/openapi.json endpoint', async () => {
        const response = await fetch(`${API_BASE}/api/openapi.json`);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should return valid OpenAPI 3.0 spec', async () => {
        const response = await fetch(`${API_BASE}/api/openapi.json`);
        const spec = await response.json();

        expect(spec.openapi).toMatch(/^3\.\d+\.\d+$/);
        expect(spec.info).toBeDefined();
        expect(spec.info.title).toBe('Personal Twin Network API');
        expect(spec.info.version).toBeDefined();
    });

    it('should include paths for Twin and Match endpoints', async () => {
        const response = await fetch(`${API_BASE}/api/openapi.json`);
        const spec = await response.json();

        expect(spec.paths).toBeDefined();
        expect(spec.paths['/api/twin/interview']).toBeDefined();
        expect(spec.paths['/api/match']).toBeDefined();
    });

    it('should include server information', async () => {
        const response = await fetch(`${API_BASE}/api/openapi.json`);
        const spec = await response.json();

        expect(spec.servers).toBeDefined();
        expect(spec.servers.length).toBeGreaterThan(0);
    });
});

describe('Swagger UI', () => {
    it('should expose /api/docs endpoint', async () => {
        const response = await fetch(`${API_BASE}/api/docs`);
        expect(response.status).toBe(200);
    });

    it('should return HTML with swagger-ui', async () => {
        const response = await fetch(`${API_BASE}/api/docs`);
        const html = await response.text();
        expect(html).toContain('swagger-ui');
    });
});
