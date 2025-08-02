import { GET } from '@/app/api/health/route';

describe('/api/health', () => {
  it('should return healthy status', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.timestamp).toBeDefined();
    expect(data.uptime).toBeDefined();
    expect(typeof data.uptime).toBe('number');
  });
});