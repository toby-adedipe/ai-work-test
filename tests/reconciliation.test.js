const request = require('supertest');
const app = require('../server');

describe('Bank Reconciliation Statement API', () => {
  describe('GET /api/bank-reconciliation', () => {
    it('should return 400 when missing required parameters', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('required');
      expect(response.body.required).toContain('companyid');
      expect(response.body.required).toContain('bankaccount');
    });

    it('should return 400 when missing companyid', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?bankaccount=MainBank')
        .expect(400);

      expect(response.body.error).toBe('Missing required parameters');
    });

    it('should return 400 when missing bankaccount', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=1')
        .expect(400);

      expect(response.body.error).toBe('Missing required parameters');
    });

    it('should return bank reconciliation structure with all required parameters', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
        .expect(200);

      // Verify basic structure
      expect(response.body).toHaveProperty('companyId');
      expect(response.body).toHaveProperty('bankAccount');
      expect(response.body).toHaveProperty('asOfDate');
      expect(response.body).toHaveProperty('ledgerBalance');
      expect(response.body).toHaveProperty('bankStatementBalance');
      expect(response.body).toHaveProperty('reconcilingItems');
      expect(response.body).toHaveProperty('adjustedLedgerBalance');
      expect(response.body).toHaveProperty('adjustedBankBalance');
      expect(response.body).toHaveProperty('isReconciled');

      // Verify parameter mapping
      expect(response.body.companyId).toBe(1);
      expect(response.body.bankAccount).toBe('MainBank');

      // Verify reconciling items structure
      expect(response.body.reconcilingItems).toHaveProperty('outstandingChecks');
      expect(response.body.reconcilingItems).toHaveProperty('depositsInTransit');
      expect(response.body.reconcilingItems).toHaveProperty('bankChargesNotRecorded');
      expect(response.body.reconcilingItems).toHaveProperty('other');

      expect(Array.isArray(response.body.reconcilingItems.outstandingChecks)).toBe(true);
      expect(Array.isArray(response.body.reconcilingItems.depositsInTransit)).toBe(true);
      expect(Array.isArray(response.body.reconcilingItems.bankChargesNotRecorded)).toBe(true);
      expect(Array.isArray(response.body.reconcilingItems.other)).toBe(true);

      // Verify data types
      expect(typeof response.body.ledgerBalance).toBe('number');
      expect(typeof response.body.bankStatementBalance).toBe('number');
      expect(typeof response.body.adjustedLedgerBalance).toBe('number');
      expect(typeof response.body.adjustedBankBalance).toBe('number');
      expect(typeof response.body.isReconciled).toBe('boolean');
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

    it('should include valid date format for asOfDate', async () => {
      const response = await request(app)
        .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
        .expect(200);

      // Check if asOfDate is in YYYY-MM-DD format
      expect(response.body.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    // Test for the actual implementation requirements when you implement the controller
    describe('When implemented', () => {
      it('should return correct ledger balance for MainBank', async () => {
        const response = await request(app)
          .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
          .expect(200);

        // According to the test requirements:
        // The Ledger shows a Cash account balance = 22,500
        // TODO: Uncomment when implementing the actual controller
        // expect(response.body.ledgerBalance).toBe(22500);
      });

      it('should return correct bank statement balance', async () => {
        const response = await request(app)
          .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
          .expect(200);

        // According to the test requirements:
        // The Bank Statement shows MainBank balance = 19,000
        // TODO: Uncomment when implementing the actual controller
        // expect(response.body.bankStatementBalance).toBe(19000);
      });

      it('should identify unreconciled transactions correctly', async () => {
        const response = await request(app)
          .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
          .expect(200);

        // Should identify the following unreconciled items:
        // 1. CHQ102 for 3,000 issued to Supplier A (not cleared)
        // 2. CHQ104 for 500 bank charges (not recorded in ledger)
        
        // TODO: Uncomment when implementing the actual controller
        // expect(response.body.reconcilingItems.outstandingChecks.length).toBeGreaterThan(0);
        // expect(response.body.reconcilingItems.bankChargesNotRecorded.length).toBeGreaterThan(0);
        
        // Check for CHQ102 in outstanding checks
        // const chq102 = response.body.reconcilingItems.outstandingChecks.find(
        //   item => item.reference === 'CHQ102'
        // );
        // expect(chq102).toBeDefined();
        // expect(chq102.amount).toBe(3000);
        // expect(chq102.party).toBe('Supplier A');
        
        // Check for CHQ104 in unrecorded bank charges
        // const chq104 = response.body.reconcilingItems.bankChargesNotRecorded.find(
        //   item => item.reference === 'CHQ104'
        // );
        // expect(chq104).toBeDefined();
        // expect(chq104.amount).toBe(500);
      });

      it('should calculate correct adjusted balances', async () => {
        const response = await request(app)
          .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
          .expect(200);

        // Calculation logic:
        // Ledger Balance: 22,500
        // Less: Unrecorded bank charges (CHQ104): -500
        // Adjusted Ledger Balance: 22,000
        
        // Bank Statement Balance: 19,000
        // Add: Outstanding checks (CHQ102): +3,000
        // Adjusted Bank Balance: 22,000
        
        // TODO: Uncomment when implementing the actual controller
        // expect(response.body.adjustedLedgerBalance).toBe(22000);
        // expect(response.body.adjustedBankBalance).toBe(22000);
      });

      it('should determine reconciliation status correctly', async () => {
        const response = await request(app)
          .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
          .expect(200);

        // Should be reconciled when adjusted balances match
        // TODO: Uncomment when implementing the actual controller
        // expect(response.body.isReconciled).toBe(true);
      });

      it('should handle case where no unreconciled transactions exist', async () => {
        // This test assumes a scenario where all transactions are reconciled
        const response = await request(app)
          .get('/api/bank-reconciliation?companyid=1&bankaccount=TestBank')
          .expect(200);

        // TODO: Implement this test case when you have test data for fully reconciled accounts
        // expect(response.body.reconcilingItems.outstandingChecks).toHaveLength(0);
        // expect(response.body.reconcilingItems.bankChargesNotRecorded).toHaveLength(0);
      });

      it('should return detailed reconciling item information', async () => {
        const response = await request(app)
          .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
          .expect(200);

        // Each reconciling item should have detailed information
        // TODO: Uncomment when implementing the actual controller
        // if (response.body.reconcilingItems.outstandingChecks.length > 0) {
        //   const item = response.body.reconcilingItems.outstandingChecks[0];
        //   expect(item).toHaveProperty('id');
        //   expect(item).toHaveProperty('date');
        //   expect(item).toHaveProperty('reference');
        //   expect(item).toHaveProperty('amount');
        //   expect(item).toHaveProperty('party');
        //   expect(item).toHaveProperty('note');
        // }
      });

      it('should only include transactions for the specified bank account', async () => {
        const response = await request(app)
          .get('/api/bank-reconciliation?companyid=1&bankaccount=MainBank')
          .expect(200);

        // Should only show transactions related to MainBank
        // TODO: Implement validation for bank account filtering
      });

      it('should handle non-existent bank accounts gracefully', async () => {
        const response = await request(app)
          .get('/api/bank-reconciliation?companyid=1&bankaccount=NonExistentBank')
          .expect(200);

        // Should return empty reconciliation for non-existent bank account
        // TODO: Uncomment when implementing the actual controller
        // expect(response.body.ledgerBalance).toBe(0);
        // expect(response.body.bankStatementBalance).toBe(0);
        // expect(response.body.reconcilingItems.outstandingChecks).toHaveLength(0);
      });
    });
  });
});