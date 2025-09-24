class CashFlowQueries {
  constructor() {
    this.baseCashFlowCTE = `
      WITH cash_transactions AS (
        SELECT 
          CASE 
            -- OPERATING: Customer payments, expense payments
            WHEN (account = 'Cash' AND note LIKE '%Payment received%' AND party NOT IN ('Investor', 'BigBank'))
                 OR account IN ('Office Rent', 'Utilities Expense', 'Bank Charges', 'Inventory')
            THEN 'Operating Activities'
            
            -- INVESTING: Equipment, property, investments
            WHEN account IN ('Equipment', 'Property', 'Investments', 'Marketable Securities')
            THEN 'Investing Activities'
            
            -- FINANCING: Capital contributions, loans
            WHEN (account = 'Cash' AND (note LIKE '%Capital%' OR party = 'Investor'))
                 OR (account = 'Cash' AND note LIKE '%Loan%' AND party = 'BigBank')
            THEN 'Financing Activities'
            
            ELSE 'Operating Activities'
          END AS activity_type,

          -- Cash flow calculation
          CASE 
            WHEN account = 'Cash' THEN debit - credit  -- Cash account: debit=inflow, credit=outflow
            ELSE -(credit - debit)  -- Expense accounts: credit=cash outflow (make negative)
          END AS cash_flow_amount,
          
          account,
          note,
          party,
          debit,
          credit,
          date

        FROM AccountingLedgerEntry
        WHERE date >= $2 
          AND date <= $3
          AND companyid = $1
          AND (
            account = 'Cash'  -- Direct cash movements
            OR 
            (bankaccount IS NOT NULL AND (debit > 0 OR credit > 0))  -- Bank account transactions
          )
          -- EXCLUDE non-cash transactions
          AND NOT (account = 'Sales' AND bankaccount IS NULL)  -- Exclude sales invoices without bank
          AND NOT (account = 'Bank Loan')  -- Exclude loan liability (use cash entry instead)
      )`;

    // Summary query
    this.cashFlowSummaryQuery = `
      ${this.baseCashFlowCTE}
      
      SELECT 
        activity_type,
        COALESCE(SUM(CASE WHEN cash_flow_amount > 0 THEN cash_flow_amount END), 0) AS cash_inflows,
        COALESCE(SUM(CASE WHEN cash_flow_amount < 0 THEN ABS(cash_flow_amount) END), 0) AS cash_outflows,
        COALESCE(SUM(cash_flow_amount), 0) AS net_cash_flow

      FROM cash_transactions
      WHERE cash_flow_amount != 0
      GROUP BY activity_type
      ORDER BY 
        CASE activity_type 
          WHEN 'Operating Activities' THEN 1 
          WHEN 'Investing Activities' THEN 2 
          WHEN 'Financing Activities' THEN 3 
        END;
    `;

    // Details query - individual transactions
    this.cashFlowDetailsQuery = `
      ${this.baseCashFlowCTE}
      
      SELECT 
        activity_type,
        cash_flow_amount,
        account,
        note,
        party,
        debit,
        credit,
        date
      FROM cash_transactions
      WHERE cash_flow_amount != 0
      ORDER BY activity_type, date;
    `;

    // Opening balance query
    this.openingBalanceQuery = `
      SELECT COALESCE(SUM(debit - credit), 0) as opening_balance
      FROM AccountingLedgerEntry 
      WHERE account = 'Cash' 
        AND companyid = $1 
        AND date < $2;
    `;
  }

  getOpeningBalanceQuery() {
    return this.openingBalanceQuery;
  }

  getCashFlowSummaryQuery() {
    return this.cashFlowSummaryQuery;
  }

  getCashFlowDetailsQuery() {
    return this.cashFlowDetailsQuery;
  }
}

module.exports = CashFlowQueries;