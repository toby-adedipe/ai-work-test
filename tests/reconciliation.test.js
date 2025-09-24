const request = require('supertest');
const app = require('../server');

describe('Bank Reconciliation Statement API', () => {
  describe('GET /api/bank-reconciliation', () => {
    it('should return 400 when missing required companyid parameter', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('required');
      expect(response.body.required).toContain('companyid');
    });

    it('should return 400 for invalid company ID', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=invalid&bankaccount=MainBank')
        .expect(400);

      expect(response.body.error).toBe('Invalid company ID');
    });

    it('should return 400 for invalid bank account type', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=1&bankaccount=123')
        .expect(400);

      expect(response.body.error).toBe('Invalid bank account');
    });

    it('should return reconciliation statement structure with required parameters', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
        .expect(200);

      // Verify basic structure
      expect(response.body).toHaveProperty('reconciliationDate');
      expect(response.body).toHaveProperty('companyId');
      expect(response.body).toHaveProperty('bankAccount');
      expect(response.body).toHaveProperty('ledgerBalance');
      expect(response.body).toHaveProperty('bankStatementBalance');
      expect(response.body).toHaveProperty('reconcilingItems');
      expect(response.body).toHaveProperty('adjustedLedgerBalance');
      expect(response.body).toHaveProperty('adjustedBankBalance');
      expect(response.body).toHaveProperty('isReconciled');
      expect(response.body).toHaveProperty('difference');
      expect(response.body).toHaveProperty('summary');

      // Verify parameter mapping
      expect(response.body.companyId).toBe(1);
      expect(response.body.bankAccount).toBe('MainBank');

      // Verify data types
      expect(typeof response.body.ledgerBalance).toBe('number');
      expect(typeof response.body.bankStatementBalance).toBe('number');
      expect(typeof response.body.adjustedLedgerBalance).toBe('number');
      expect(typeof response.body.adjustedBankBalance).toBe('number');
      expect(typeof response.body.isReconciled).toBe('boolean');
      expect(typeof response.body.difference).toBe('number');

      // Verify reconciling items structure
      expect(response.body.reconcilingItems).toHaveProperty('outstandingChecks');
      expect(response.body.reconcilingItems).toHaveProperty('depositsInTransit');
      expect(response.body.reconcilingItems).toHaveProperty('ledgerAdjustments');
      expect(response.body.reconcilingItems).toHaveProperty('bankErrors');

      // Verify reconciling items have correct structure
      expect(response.body.reconcilingItems.outstandingChecks).toHaveProperty('items');
      expect(response.body.reconcilingItems.outstandingChecks).toHaveProperty('totalAmount');
      expect(response.body.reconcilingItems.outstandingChecks).toHaveProperty('count');
      expect(Array.isArray(response.body.reconcilingItems.outstandingChecks.items)).toBe(true);
      expect(typeof response.body.reconcilingItems.outstandingChecks.totalAmount).toBe('number');
      expect(typeof response.body.reconcilingItems.outstandingChecks.count).toBe('number');

      expect(response.body.reconcilingItems.depositsInTransit).toHaveProperty('items');
      expect(response.body.reconcilingItems.depositsInTransit).toHaveProperty('totalAmount');
      expect(response.body.reconcilingItems.depositsInTransit).toHaveProperty('count');
      expect(Array.isArray(response.body.reconcilingItems.depositsInTransit.items)).toBe(true);

      expect(response.body.reconcilingItems.ledgerAdjustments).toHaveProperty('items');
      expect(response.body.reconcilingItems.ledgerAdjustments).toHaveProperty('totalAmount');
      expect(response.body.reconcilingItems.ledgerAdjustments).toHaveProperty('count');
      expect(Array.isArray(response.body.reconcilingItems.ledgerAdjustments.items)).toBe(true);

      expect(response.body.reconcilingItems.bankErrors).toHaveProperty('items');
      expect(response.body.reconcilingItems.bankErrors).toHaveProperty('totalAmount');
      expect(response.body.reconcilingItems.bankErrors).toHaveProperty('count');
      expect(Array.isArray(response.body.reconcilingItems.bankErrors.items)).toBe(true);

      // Verify summary structure
      expect(response.body.summary).toHaveProperty('totalUnreconciledItems');
      expect(response.body.summary).toHaveProperty('ledgerBalanceAfterAdjustments');
      expect(response.body.summary).toHaveProperty('bankBalanceAfterAdjustments');
      expect(response.body.summary).toHaveProperty('netDifference');
      expect(typeof response.body.summary.totalUnreconciledItems).toBe('number');
      expect(typeof response.body.summary.ledgerBalanceAfterAdjustments).toBe('number');
      expect(typeof response.body.summary.bankBalanceAfterAdjustments).toBe('number');
      expect(typeof response.body.summary.netDifference).toBe('number');
    });

    it('should handle different company IDs', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=2&bankaccount=MainBank')
        .expect(200);

      expect(response.body.companyId).toBe(2);
    });

    it('should handle different bank accounts', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=1&bankaccount=SecondaryBank')
        .expect(200);

      expect(response.body.bankAccount).toBe('SecondaryBank');
    });

    it('should work without bank account parameter (optional)', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=1')
        .expect(200);

      expect(response.body.companyId).toBe(1);
      expect(response.body.bankAccount).toBe('MainBank'); // Should default to MainBank
    });

    it('should include valid date format for reconciliationDate', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
        .expect(200);

      // Check if reconciliationDate is in YYYY-MM-DD format
      expect(response.body.reconciliationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return valid JSON response', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
        .expect(200)
        .expect('Content-Type', /json/);

      // Should be valid JSON
      expect(typeof response.body).toBe('object');
    });

    it('should handle large company ID numbers', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=999999&bankaccount=MainBank')
        .expect(200);

      expect(response.body.companyId).toBe(999999);
    });

    it('should include all required item properties when items exist', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
        .expect(200);

      // Check that if items exist, they have all required properties
      const checkItemStructure = (items) => {
        items.forEach(item => {
          expect(item).toHaveProperty('reference');
          expect(item).toHaveProperty('date');
          expect(item).toHaveProperty('account');
          expect(item).toHaveProperty('amount');
          expect(item).toHaveProperty('description');
          expect(item).toHaveProperty('party');
          expect(item).toHaveProperty('note');
        });
      };

      if (response.body.reconcilingItems.outstandingChecks.items.length > 0) {
        checkItemStructure(response.body.reconcilingItems.outstandingChecks.items);
      }

      if (response.body.reconcilingItems.depositsInTransit.items.length > 0) {
        checkItemStructure(response.body.reconcilingItems.depositsInTransit.items);
      }

      if (response.body.reconcilingItems.ledgerAdjustments.items.length > 0) {
        response.body.reconcilingItems.ledgerAdjustments.items.forEach(item => {
          checkItemStructure([item]);
          expect(item).toHaveProperty('type');
          expect(item).toHaveProperty('adjustmentType');
        });
      }

      if (response.body.reconcilingItems.bankErrors.items.length > 0) {
        checkItemStructure(response.body.reconcilingItems.bankErrors.items);
      }
    });
  });
});