const path = require('path');
process.argv[2] = path.join(__dirname, 'deadmedia.json');
const request = require('supertest');
const app = require('./index');

describe('GET /media', () => {
    it('GET /media -- Should retrieve a list of media resources', async () => {
        const response = await request(app).get('/media');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('count');
        expect(response.body).toHaveProperty('previous');
        expect(response.body).toHaveProperty('next');
        expect(response.body).toHaveProperty('results');
    });

    it('GET /media -- Should return status code 500 due to invalid limit', async () => {
        const response = await request(app).get('/media?limit=-1&offset=0');
        expect(response.status).toBe(500);
        expect(response.body).toEqual({});
    });

    it('GET /media -- Should return status code 500 due to invalid offset', async () => {
        const response = await request(app).get('/media?limit=10&offset=-1');
        expect(response.status).toBe(500);
        expect(response.body).toEqual({});
    });

    it('GET /media -- Should return proper links for next link and previous link', async () => {
        const response = await request(app).get('/media?limit=5&offset=5');
    
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('next');
        expect(response.body).toHaveProperty('previous');
        expect(parseInt(new URL(response.body.next, 'http://localhost').searchParams.get('offset'))).toBe(10);
        expect(parseInt(new URL(response.body.next, 'http://localhost').searchParams.get('limit'))).toBe(5);
        expect(parseInt(new URL(response.body.previous, 'http://localhost').searchParams.get('offset'))).toBe(0);
        expect(parseInt(new URL(response.body.previous, 'http://localhost').searchParams.get('limit'))).toBe(5);      
    });

    it('GET /media -- Should return previous link with offset 0 and limit up to but not including data returned when limit would run out of bounds', async () => {
        const response = await request(app).get('/media?limit=10&offset=5');
    
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('next');
        expect(response.body).toHaveProperty('previous');
        expect(parseInt(new URL(response.body.next, 'http://localhost').searchParams.get('offset'))).toBe(15);
        expect(parseInt(new URL(response.body.next, 'http://localhost').searchParams.get('limit'))).toBe(10);
        expect(parseInt(new URL(response.body.previous, 'http://localhost').searchParams.get('offset'))).toBe(0);
        expect(parseInt(new URL(response.body.previous, 'http://localhost').searchParams.get('limit'))).toBe(5);
    });

    it('GET /media -- Should return remaining resources after offset when offset + limit is out of bounds', async () => {
        const response = await request(app).get('/media?limit=10&offset=15');
    
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('next', null);
        expect(response.body).toHaveProperty('previous');
        expect(response.body.results.length).toEqual(5);
        expect(response.body.results[0].id).toBe('/media/15');
    });
    
    it('GET /media -- Should return valid previous link and null next link', async () => {
        const response = await request(app).get('/media?limit=10&offset=19');
    
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('next');
        expect(response.body).toHaveProperty('previous');
        expect(parseInt(new URL(response.body.next, 'http://localhost').searchParams.get('offset'))).toBe(NaN);
        expect(parseInt(new URL(response.body.next, 'http://localhost').searchParams.get('limit'))).toBe(NaN);
        expect(parseInt(new URL(response.body.previous, 'http://localhost').searchParams.get('offset'))).toBe(9);
        expect(parseInt(new URL(response.body.previous, 'http://localhost').searchParams.get('limit'))).toBe(10);
    });

    it('GET /media -- Should return valid next link and null previous link', async () => {
        const response = await request(app).get('/media?limit=10&offset=0');
    
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('next');
        expect(response.body).toHaveProperty('previous');
        expect(parseInt(new URL(response.body.next, 'http://localhost').searchParams.get('offset'))).toBe(10);
        expect(parseInt(new URL(response.body.next, 'http://localhost').searchParams.get('limit'))).toBe(10);
        expect(parseInt(new URL(response.body.previous, 'http://localhost').searchParams.get('offset'))).toBe(NaN);
        expect(parseInt(new URL(response.body.previous, 'http://localhost').searchParams.get('limit'))).toBe(NaN);
    });

    it('GET /media -- Should return the proper media based on name', async () => {
        const response = await request(app).get('/media?name=Akira');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('count');
        expect(response.body.count).toEqual(1);
    });

    it('GET /media -- Should return the proper media based on type', async () => {
        const response = await request(app).get('/media?type=DVD');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('count');
        expect(response.body.count).toEqual(9);
    });

    it('GET /media -- Should return the proper media based on desc', async () => {
        const response = await request(app).get('/media?desc=Influential%20Japanese%20anime%20film.');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('count');
        expect(response.body.count).toEqual(1);
    });

    it('GET /media -- Should return status code 204 for invalid query (missing capitalization)', async () => {
        const response = await request(app).get('/media?name=akira');
        
        expect(response.status).toBe(204);
    });

    it('GET /media -- Should return correct links and proper media using query and pagination', async () => {
        const res = await request(app).post('/media').send({
            name: 'Akira',
            type: 'DVD',
            desc: 'Influential Japanese anime film.'
        });
        await request(app).post('/media').send({
            name: 'Akira',
            type: 'DVD',
            desc: 'Influential Japanese anime film.'
        });

        const response = await request(app).get('/media?name=Akira&type=DVD&desc=Influential%20Japanese%20anime%20film.&offset=1&limit=1');
    
        expect(parseInt(new URL(response.body.next, 'http://localhost').searchParams.get('offset'))).toBe(2);
        expect(parseInt(new URL(response.body.next, 'http://localhost').searchParams.get('limit'))).toBe(1);
        expect(new URL(response.body.next, 'http://localhost').searchParams.get('name')).toBe('Akira');
        expect(new URL(response.body.next, 'http://localhost').searchParams.get('type')).toBe('DVD');
        expect(new URL(response.body.next, 'http://localhost').searchParams.get('desc')).toBe('Influential Japanese anime film.');
        expect(parseInt(new URL(response.body.previous, 'http://localhost').searchParams.get('offset'))).toBe(0);
        expect(parseInt(new URL(response.body.previous, 'http://localhost').searchParams.get('limit'))).toBe(1);
        expect(new URL(response.body.previous, 'http://localhost').searchParams.get('name')).toBe('Akira');
        expect(new URL(response.body.previous, 'http://localhost').searchParams.get('type')).toBe('DVD');
        expect(new URL(response.body.previous, 'http://localhost').searchParams.get('desc')).toBe('Influential Japanese anime film.');
    });
});
    
describe('GET /media:id', () => {    
    it('GET /media/:id -- Should retrieve a single media resource by ID', async () => {
        const response = await request(app).get(`/media/19`);
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(`/media/19`);
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('type');
        expect(response.body).toHaveProperty('desc');
    });

    it('GET /media/:id -- Should return status code 404 due to invalid ID', async () => {
        const response = await request(app).get(`/media/123`);
        expect(response.status).toBe(404);
    });
});


describe('POST /media', () => {
    it('POST -- Should create a new dead media resource', async () => {
        const response = await request(app)
            .post('/media')
            .send({
                name: 'Test Media',
                type: 'CD',
                desc: 'Test Description',
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe('Test Media');
        createdMediaId = response.body.id;
        expect(createdMediaId).toBe('/media/22')
    });

    it('POST -- Should return status code 400 due to invalid format (lacking desc)', async () => {
        const response = await request(app)
            .post('/media')
            .send({
                name: 'Test Media',
                type: 'Test Type',
            });

        expect(response.status).toBe(400);
    });

    it('POST -- Should return status code 400 due to invalid format (wrong type)', async () => {
        const response = await request(app)
            .post('/media')
            .send({
                name: 9,
                type: 'CD',
                desc: 'Test Description',
            });

        expect(response.status).toBe(400);
    });
});

describe('PUT /media/:id', () => {
    it('PUT /media/:id -- Should update a dead media resource', async () => {
        const response = await request(app)
            .put(`${createdMediaId}`)
            .send({
                name: 'Updated Test Media',
                type: 'CD',
                desc: 'Updated Test Description',
            });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Test Media');
        expect(createdMediaId).toBe('/media/22')
    });

    it('PUT /media/:id -- Should return status code 400 due invalid format (lacking name)', async () => {
        const response = await request(app)
            .put(`${createdMediaId}`)
            .send({
                type: 'CD',
                desc: 'Updated Test Description',
            });

        expect(response.status).toBe(400);
    });

    it('PUT /media/:id -- Should return status code 400 due invalid format (wrong type)', async () => {
        const response = await request(app)
            .put(`${createdMediaId}`)
            .send({
                name: 9,
                type: 'CD',
                desc: 'Updated Test Description',
            });

        expect(response.status).toBe(400);
    });

    it('PUT /media/:id -- Should return status code 404 due invalid ID', async () => {
        const response = await request(app)
            .put(`/media/123`)
            .send({
                name: 'Updated Test Media',
                type: 'CD',
                desc: 'Updated Test Description',
            });

        expect(response.status).toBe(404);
    });
});


describe('DELETE /media/:id', () => {
    it('DELETE /media/:id -- Should delete a dead media resource', async () => {
        const response = await request(app).delete(`${createdMediaId}`);
        expect(response.status).toBe(204);
        const deletedMediaResponse = await request(app).get(`${createdMediaId}`);
        expect(deletedMediaResponse.status).toBe(404);
    });
});


describe('Miscellaneous', () => {
    it('Should handle invalid routes gracefully', async () => {
        const response = await request(app).get('/invalid-route');
        expect(response.status).toBe(404);
    });
});

