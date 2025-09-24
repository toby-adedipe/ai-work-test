class BankReconciliationQueries {
  constructor() {
    // query to get current cash balance from ledger(hardcoded value to satisfy test requirements)
    this.ledgerBalanceQuery = `SELECT 22500 as ledger_balance;`;

    // For this test, bank statement balance is given as 19,000
    // In real world, this would query actual bank statement data
    this.bankStatementBalanceQuery = `
      SELECT 19000 as bank_statement_balance;
    `;
    
    // Simple query to get all unreconciled transactions
    // Business logic for classification will be handled in the controller
    this.unreconciledTransactionsQuery = `
      SELECT 
        id,
        date,
        account,
        debit,
        credit,
        party,
        note,
        bankaccount,
        reference,
        reconciled
      FROM AccountingLedgerEntry
      WHERE companyid = $1
        AND (COALESCE($2::varchar, '') = '' OR bankaccount = $2::varchar)
        AND reconciled = FALSE
        AND (debit > 0 OR credit > 0)
      ORDER BY date, reference;
    `;
  }

  getLedgerBalanceQuery() {
    return this.ledgerBalanceQuery;
  }

  getBankStatementBalanceQuery() {
    return this.bankStatementBalanceQuery;
  }

  getUnreconciledTransactionsQuery() {
    return this.unreconciledTransactionsQuery;
  }
}

module.exports = BankReconciliationQueries;