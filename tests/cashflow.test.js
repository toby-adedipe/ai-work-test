const request = require('supertest');
const app = require('../server');

describe('Cash Flow Statement API', () => {
  describe('GET /api/cashflow', () => {
    it('should return 400 when missing required parameters', async () => {
      const response = await request(app)
        .get('/api/cashflow')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('required');
      expect(response.body.required).toContain('companyid');
      expect(response.body.required).toContain('fromDate');
      expect(response.body.required).toContain('toDate');
    });

    it('should return 400 when missing companyid', async () => {
      const response = await request(app)
        .get('/api/cashflow?fromDate=2025-01-01&toDate=2025-01-31')
        .expect(400);

      expect(response.body.error).toBe('Missing required parameters');
    });

    it('should return 400 when missing fromDate', async () => {
      const response = await request(app)
        .get('/api/cashflow?companyid=1&toDate=2025-01-31')
        .expect(400);

      expect(response.body.error).toBe('Missing required parameters');
    });

    it('should return 400 when missing toDate', async () => {
      const response = await request(app)
        .get('/api/cashflow?companyid=1&fromDate=2025-01-01')
        .expect(400);

      expect(response.body.error).toBe('Missing required parameters');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/api/cashflow?companyid=1&fromDate=01-01-2025&toDate=2025-01-31')
        .expect(400);

      expect(response.body.error).toBe('Invalid date format');
    });

    it('should return 400 for invalid company ID', async () => {
      const response = await request(app)
        .get('/api/cashflow?companyid=invalid&fromDate=2025-01-01&toDate=2025-01-31')
        .expect(400);

      expect(response.body.error).toBe('Invalid company ID');
    });

    it('should return cash flow statement structure with valid parameters', async () => {
      const response = await request(app)
        .get('/api/cashflow?companyid=1&fromDate=2025-01-01&toDate=2025-01-31')
        .expect(200);

      // Verify basic structure
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('operatingActivities');
      expect(response.body).toHaveProperty('investingActivities');
      expect(response.body).toHaveProperty('financingActivities');
      expect(response.body).toHaveProperty('summary');

      // Verify period information
      expect(response.body.period).toHaveProperty('fromDate', '2025-01-01');
      expect(response.body.period).toHaveProperty('toDate', '2025-01-31');
      expect(response.body.period).toHaveProperty('companyId', 1);

      // Verify operating activities structure
      expect(response.body.operatingActivities).toHaveProperty('inflows');
      expect(response.body.operatingActivities).toHaveProperty('outflows');
      expect(response.body.operatingActivities).toHaveProperty('netOperatingCashFlow');
      expect(Array.isArray(response.body.operatingActivities.inflows)).toBe(true);
      expect(Array.isArray(response.body.operatingActivities.outflows)).toBe(true);
      expect(typeof response.body.operatingActivities.netOperatingCashFlow).toBe('number');

      // Verify investing activities structure
      expect(response.body.investingActivities).toHaveProperty('inflows');
      expect(response.body.investingActivities).toHaveProperty('outflows');
      expect(response.body.investingActivities).toHaveProperty('netInvestingCashFlow');
      expect(Array.isArray(response.body.investingActivities.inflows)).toBe(true);
      expect(Array.isArray(response.body.investingActivities.outflows)).toBe(true);
      expect(typeof response.body.investingActivities.netInvestingCashFlow).toBe('number');

      // Verify financing activities structure
      expect(response.body.financingActivities).toHaveProperty('inflows');
      expect(response.body.financingActivities).toHaveProperty('outflows');
      expect(response.body.financingActivities).toHaveProperty('netFinancingCashFlow');
      expect(Array.isArray(response.body.financingActivities.inflows)).toBe(true);
      expect(Array.isArray(response.body.financingActivities.outflows)).toBe(true);
      expect(typeof response.body.financingActivities.netFinancingCashFlow).toBe('number');

      // Verify summary structure
      expect(response.body.summary).toHaveProperty('totalCashInflows');
      expect(response.body.summary).toHaveProperty('totalCashOutflows');
      expect(response.body.summary).toHaveProperty('netChangeInCash');
      expect(response.body.summary).toHaveProperty('openingCashBalance');
      expect(response.body.summary).toHaveProperty('closingCashBalance');
      expect(typeof response.body.summary.totalCashInflows).toBe('number');
      expect(typeof response.body.summary.totalCashOutflows).toBe('number');
      expect(typeof response.body.summary.netChangeInCash).toBe('number');
      expect(typeof response.body.summary.openingCashBalance).toBe('number');
      expect(typeof response.body.summary.closingCashBalance).toBe('number');
    });

    it('should handle different company IDs', async () => {
      const response = await request(app)
        .get('/api/cashflow?companyid=2&fromDate=2025-01-01&toDate=2025-01-31')
        .expect(200);

      expect(response.body.period.companyId).toBe(2);
    });

    it('should handle different date ranges', async () => {
      const response = await request(app)
        .get('/api/cashflow?companyid=1&fromDate=2025-01-15&toDate=2025-01-31')
        .expect(200);

      expect(response.body.period.fromDate).toBe('2025-01-15');
      expect(response.body.period.toDate).toBe('2025-01-31');
    });

    it('should return valid JSON response', async () => {
      const response = await request(app)
        .get('/api/cashflow?companyid=1&fromDate=2025-01-01&toDate=2025-01-31')
        .expect(200)
        .expect('Content-Type', /json/);

      // Should be valid JSON
      expect(typeof response.body).toBe('object');
    });
  });
});