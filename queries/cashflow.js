class CashFlowQueries {
  constructor() {
    // query to get all relevant transactions for cash flow analysis
    this.transactionsQuery = `
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
      WHERE date >= $2 
        AND date <= $3
        AND companyid = $1
        AND (
          account = 'Cash'  -- Direct cash movements
          OR 
          (bankaccount IS NOT NULL AND (debit > 0 OR credit > 0))  -- Bank account transactions
        )
        -- Exclude non-cash transactions like sales invoices without bank account
        AND NOT (account = 'Sales' AND bankaccount IS NULL)
      ORDER BY date, account, reference;
    `;

    // Opening balance query - sum all cash transactions before the period
    this.openingBalanceQuery = `
      SELECT COALESCE(SUM(debit - credit), 0) as opening_balance
      FROM AccountingLedgerEntry 
      WHERE account = 'Cash' 
        AND companyid = $1 
        AND date < $2;
    `;
  }

  getTransactionsQuery() {
    return this.transactionsQuery;
  }

  getOpeningBalanceQuery() {
    return this.openingBalanceQuery;
  }
}

module.exports = CashFlowQueries;