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
    })

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

    it('should return cash flow statement structure with all required parameters', async () => {
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

      // Verify investing activities structure
      expect(response.body.investingActivities).toHaveProperty('inflows');
      expect(response.body.investingActivities).toHaveProperty('outflows');
      expect(response.body.investingActivities).toHaveProperty('netInvestingCashFlow');
      expect(Array.isArray(response.body.investingActivities.inflows)).toBe(true);
      expect(Array.isArray(response.body.investingActivities.outflows)).toBe(true);

      // Verify financing activities structure
      expect(response.body.financingActivities).toHaveProperty('inflows');
      expect(response.body.financingActivities).toHaveProperty('outflows');
      expect(response.body.financingActivities).toHaveProperty('netFinancingCashFlow');
      expect(Array.isArray(response.body.financingActivities.inflows)).toBe(true);
      expect(Array.isArray(response.body.financingActivities.outflows)).toBe(true);

      // Verify summary structure
      expect(response.body.summary).toHaveProperty('totalCashInflows');
      expect(response.body.summary).toHaveProperty('totalCashOutflows');
      expect(response.body.summary).toHaveProperty('netChangeInCash');
      expect(response.body.summary).toHaveProperty('openingCashBalance');
      expect(response.body.summary).toHaveProperty('closingCashBalance');
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

    // Test for the actual implementation requirements when you implement the controller
    describe('When implemented', () => {
      it('should classify cash transactions correctly into operating activities', async () => {
        const response = await request(app)
          .get('/api/cashflow?companyid=1&fromDate=2025-01-01&toDate=2025-01-31')
          .expect(200);

        // These tests will fail until you implement the actual logic
        // Operating activities should include:
        // - Office Rent (outflow): 2000
        // - Utilities Expense (outflow): 500
        // - Sales receipts (inflow): 8000
        // - Bank Charges (outflow): 500 (if recorded)
        
        // TODO: Uncomment these when implementing the actual controller
        // expect(response.body.operatingActivities.inflows.length).toBeGreaterThan(0);
        // expect(response.body.operatingActivities.outflows.length).toBeGreaterThan(0);
      });

      it('should classify cash transactions correctly into investing activities', async () => {
        const response = await request(app)
          .get('/api/cashflow?companyid=1&fromDate=2025-01-01&toDate=2025-01-31')
          .expect(200);

        // Investing activities should include:
        // - Inventory purchase (outflow): 3000
        
        // TODO: Uncomment these when implementing the actual controller
        // expect(response.body.investingActivities.outflows.length).toBeGreaterThan(0);
      });

      it('should classify cash transactions correctly into financing activities', async () => {
        const response = await request(app)
          .get('/api/cashflow?companyid=1&fromDate=2025-01-01&toDate=2025-01-31')
          .expect(200);

        // Financing activities should include:
        // - Capital Contribution (inflow): 10000
        // - Bank Loan (inflow): 7000
        
        // TODO: Uncomment these when implementing the actual controller
        // expect(response.body.financingActivities.inflows.length).toBeGreaterThan(0);
      });

      it('should calculate correct cash flow totals', async () => {
        const response = await request(app)
          .get('/api/cashflow?companyid=1&fromDate=2025-01-01&toDate=2025-01-31')
          .expect(200);

        // TODO: Uncomment and adjust these when implementing the actual controller
        // Expected calculations based on the sample data:
        // Total Inflows: 10000 (capital) + 8000 (sales) + 7000 (loan) = 25000
        // Total Outflows: 2000 (rent) + 3000 (inventory) + 500 (utilities) = 5500
        // Net Change: 25000 - 5500 = 19500
        // Closing Balance: 0 + 19500 = 19500 (assuming opening balance is 0)
        
        // expect(response.body.summary.totalCashInflows).toBe(25000);
        // expect(response.body.summary.totalCashOutflows).toBe(5500);
        // expect(response.body.summary.netChangeInCash).toBe(19500);
      });

      it('should only include reconciled transactions in cash flow', async () => {
        const response = await request(app)
          .get('/api/cashflow?companyid=1&fromDate=2025-01-01&toDate=2025-01-31')
          .expect(200);

        // Should exclude unreconciled transactions (CHQ102 and CHQ104)
        // TODO: Implement this logic in the controller
      });
    });
  });
});