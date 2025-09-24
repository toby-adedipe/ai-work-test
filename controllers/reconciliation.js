const db = require('../config/database');
const BankReconciliationQueries = require('../queries/reconciliation');

class BankReconciliationController {
  constructor() {
    this.queries = new BankReconciliationQueries();
  }

  async getLedgerBalance(companyId, bankAccount) {
    const result = await db.query(this.queries.getLedgerBalanceQuery());
    return parseFloat(result.rows[0]?.ledger_balance) || 0;
  }

  async getBankStatementBalance() {
    const result = await db.query(this.queries.getBankStatementBalanceQuery());
    return parseFloat(result.rows[0]?.bank_statement_balance) || 0;
  }

  async getUnreconciledTransactions(companyId, bankAccount) {
    const result = await db.query(this.queries.getUnreconciledTransactionsQuery(), [companyId, bankAccount || '']);
    return result.rows || [];
  }

  // Accounting Business Logic: Classify unreconciled items according to bank reconciliation principles
  classifyReconciliationItem(transaction) {
    const { account, debit, credit, bankaccount, note, reference } = transaction;
    
    // Important: Outstanding items affect BANK balance, Unrecorded items affect LEDGER balance
    
    // Deposits in transit: Cash debits that haven't cleared the bank yet
    if (account === 'Cash' && debit > 0 && bankaccount) {
      return 'DEPOSIT_IN_TRANSIT';
    }
    
    // Outstanding withdrawals: Cash credits that haven't cleared the bank yet
    if (account === 'Cash' && credit > 0 && bankaccount) {
      return 'OUTSTANDING_WITHDRAWAL';
    }
    
    // Outstanding checks: Non-cash expenses/purchases that haven't cleared the bank
    // These are issued by company but not yet processed by bank
    if (account !== 'Cash' && credit > 0 && bankaccount) {
      // Special case: Bank charges that are unrecorded in ledger should be ledger adjustments
      if (this.isUnrecordedBankCharge(transaction)) {
        return 'UNRECORDED_BANK_CHARGE';
      }
      return 'OUTSTANDING_CHECK';
    }
    
    // Unrecorded bank charges: Bank-initiated charges not recorded in company ledger
    if (this.isUnrecordedBankCharge(transaction)) {
      return 'UNRECORDED_BANK_CHARGE';
    }
    
    // Unrecorded deposits: Bank credits not yet recorded in ledger
    if (account !== 'Cash' && debit > 0 && bankaccount) {
      return 'UNRECORDED_DEPOSIT';
    }
    
    // unrecorded interest: Interest earned but not recorded
    if (account === 'Interest Income' || (note && note.toLowerCase().includes('interest'))) {
      return 'UNRECORDED_INTEREST';
    }
    
    return 'OTHER';
  }

  // Determine if transaction represents unrecorded bank charges based on account type and business logic
  isUnrecordedBankCharge(transaction) {
    const { account, note, party } = transaction;
        
    // 1. Bank-specific account types (bank-initiated)
    if (['Bank Charges', 'Bank Fees', 'Service Charges', 'NSF Fees', 
         'Wire Transfer Fees', 'ATM Fees', 'Monthly Service Fee',
         'Overdraft Fees', 'Check Processing Fees'].includes(account)) {
      return true;
    }
    
    // 2. Party-based identification (transactions from banks/financial institutions)
    if (party && (party.toLowerCase().includes('bank') || 
                 party.toLowerCase().includes('financial') ||
                 party.toLowerCase().includes('credit union'))) {
      // If it's from a bank and it's a fee-like account, likely unrecorded
      if (account.toLowerCase().includes('charge') || 
          account.toLowerCase().includes('fee') ||
          note && (note.toLowerCase().includes('service') || 
                  note.toLowerCase().includes('monthly'))) {
        return true;
      }
    }
    
    // 3. Note-based patterns (bank-initiated language)
    if (note && (note.toLowerCase().includes('bank charge') || 
                note.toLowerCase().includes('service charge') ||
                note.toLowerCase().includes('monthly fee') ||
                note.toLowerCase().includes('bank fee') ||
                note.toLowerCase().includes('maintenance fee'))) {
      return true;
    }
    
    return false;
  }

  // Calculate transaction amount for reconciliation purposes
  calculateTransactionAmount(transaction) {
    const { account, debit, credit } = transaction;
    
    if (account === 'Cash') {
      // For Cash account: show as signed amount (debit +, credit -)
      return debit - credit;
    } else {
      // For other accounts: show the transaction amount as positive
      return credit > 0 ? credit : debit;
    }
  }

  // Generate description for reconciling items
  generateReconciliationDescription(transaction, itemType) {
    const { account, note } = transaction;
    
    switch (itemType) {
      case 'DEPOSIT_IN_TRANSIT':
        return `Deposit in transit - ${note || 'Cash deposit'}`;
      case 'OUTSTANDING_WITHDRAWAL':
        return `Outstanding withdrawal - ${note || 'Cash withdrawal'}`;
      case 'OUTSTANDING_CHECK':
        return `Outstanding check - ${note || account}`;
      case 'UNRECORDED_BANK_CHARGE':
        return `Unrecorded bank charges - ${note || account}`;
      case 'UNRECORDED_DEPOSIT':
        return `Unrecorded deposit - ${note || account}`;
      case 'UNRECORDED_INTEREST':
        return `Unrecorded interest - ${note || 'Interest earned'}`;
      default:
        return note || 'Unreconciled transaction';
    }
  }

  // Process unreconciled transactions and calculate adjusted balances
  processReconciliation(ledgerBalance, bankBalance, unreconciledTransactions) {
    const reconcilingItems = {
      outstandingChecks: [],
      depositsInTransit: [],
      bankErrors: [],
      ledgerAdjustments: []
    };

    let adjustedLedgerBalance = ledgerBalance;
    let adjustedBankBalance = bankBalance;

    unreconciledTransactions.forEach(transaction => {
      const itemType = this.classifyReconciliationItem(transaction);
      const transactionAmount = this.calculateTransactionAmount(transaction);
      const description = this.generateReconciliationDescription(transaction, itemType);

      const itemData = {
        reference: transaction.reference,
        date: transaction.date,
        account: transaction.account,
        amount: Math.abs(transactionAmount),
        description: description,
        party: transaction.party,
        note: transaction.note
      };

      // Apply bank reconciliation principles
      // Outstanding items: Adjust BANK balance to match ledger
      // Unrecorded items: Adjust LEDGER balance to match bank
      switch (itemType) {
        case 'OUTSTANDING_CHECK':
          // Outstanding checks: Add back to bank balance (bank hasn't processed yet)
          reconcilingItems.outstandingChecks.push(itemData);
          adjustedBankBalance += Math.abs(transactionAmount);
          break;
          
        case 'DEPOSIT_IN_TRANSIT':
          // Deposits in transit: Add to bank balance (bank hasn't recorded yet)
          reconcilingItems.depositsInTransit.push(itemData);
          adjustedBankBalance += Math.abs(transactionAmount);
          break;
          
        case 'OUTSTANDING_WITHDRAWAL':
          // Outstanding withdrawals: Add back to bank balance
          reconcilingItems.depositsInTransit.push(itemData); // Group with deposits for display
          adjustedBankBalance += Math.abs(transactionAmount);
          break;
          
        case 'UNRECORDED_DEPOSIT':
        case 'UNRECORDED_INTEREST':
          // Unrecorded deposits/interest: Add to ledger balance
          reconcilingItems.ledgerAdjustments.push({
            ...itemData,
            type: itemType === 'UNRECORDED_INTEREST' ? 'Unrecorded interest' : 'Unrecorded deposit',
            adjustmentType: 'increase'
          });
          adjustedLedgerBalance += Math.abs(transactionAmount);
          break;
          
        case 'UNRECORDED_BANK_CHARGE':
          // Unrecorded bank charges: Subtract from ledger balance
          // These are charges the bank has processed but company hasn't recorded
          reconcilingItems.ledgerAdjustments.push({
            ...itemData,
            type: 'Unrecorded bank charges',
            adjustmentType: 'decrease'
          });
          adjustedLedgerBalance -= Math.abs(transactionAmount);
          break;
          
        default:
          // Unknown items: classify as potential bank errors
          reconcilingItems.bankErrors.push(itemData);
          break;
      }
    });

    return {
      reconcilingItems,
      adjustedLedgerBalance,
      adjustedBankBalance
    };
  }

  formatReconciliationStatement(reconciliationData, ledgerBalance, bankBalance, companyId, bankAccount) {
    const { reconcilingItems, adjustedLedgerBalance, adjustedBankBalance } = reconciliationData;

    return {
      reconciliationDate: new Date().toISOString().split('T')[0],
      asOfDate: new Date().toISOString().split('T')[0],
      companyId,
      bankAccount: bankAccount || 'MainBank',
      
      // Starting balances
      ledgerBalance: Math.round(ledgerBalance * 100) / 100,
      bankStatementBalance: Math.round(bankBalance * 100) / 100,
      
      // Reconciling items with totals
      reconcilingItems: {
        outstandingChecks: {
          items: reconcilingItems.outstandingChecks,
          totalAmount: Math.round(reconcilingItems.outstandingChecks.reduce((sum, item) => sum + item.amount, 0) * 100) / 100,
          count: reconcilingItems.outstandingChecks.length
        },
        depositsInTransit: {
          items: reconcilingItems.depositsInTransit,
          totalAmount: Math.round(reconcilingItems.depositsInTransit.reduce((sum, item) => sum + item.amount, 0) * 100) / 100,
          count: reconcilingItems.depositsInTransit.length
        },
        ledgerAdjustments: {
          items: reconcilingItems.ledgerAdjustments,
          totalAmount: Math.round(reconcilingItems.ledgerAdjustments.reduce((sum, item) => 
            sum + (item.adjustmentType === 'increase' ? item.amount : -item.amount), 0
          ) * 100) / 100,
          count: reconcilingItems.ledgerAdjustments.length
        },
        bankErrors: {
          items: reconcilingItems.bankErrors,
          totalAmount: Math.round(reconcilingItems.bankErrors.reduce((sum, item) => sum + item.amount, 0) * 100) / 100,
          count: reconcilingItems.bankErrors.length
        }
      },
      
      // Final adjusted balances
      adjustedLedgerBalance: Math.round(adjustedLedgerBalance * 100) / 100,
      adjustedBankBalance: Math.round(adjustedBankBalance * 100) / 100,
      
      // Reconciliation status
      isReconciled: Math.abs(adjustedLedgerBalance - adjustedBankBalance) < 0.01,
      difference: Math.round((adjustedLedgerBalance - adjustedBankBalance) * 100) / 100,
      
      // Summary
      summary: {
        totalUnreconciledItems: reconcilingItems.outstandingChecks.length + 
                               reconcilingItems.depositsInTransit.length + 
                               reconcilingItems.ledgerAdjustments.length + 
                               reconcilingItems.bankErrors.length,
        ledgerBalanceAfterAdjustments: Math.round(adjustedLedgerBalance * 100) / 100,
        bankBalanceAfterAdjustments: Math.round(adjustedBankBalance * 100) / 100,
        netDifference: Math.round((adjustedLedgerBalance - adjustedBankBalance) * 100) / 100
      }
    };
  }

  async getBankReconciliationStatement(companyId, bankAccount) {
    try {
      const [ledgerBalance, bankBalance, unreconciledTransactions] = await Promise.all([
        this.getLedgerBalance(companyId, bankAccount),
        this.getBankStatementBalance(),
        this.getUnreconciledTransactions(companyId, bankAccount)
      ]);

      const reconciliationData = this.processReconciliation(
        ledgerBalance, 
        bankBalance, 
        unreconciledTransactions
      );

      return this.formatReconciliationStatement(
        reconciliationData,
        ledgerBalance,
        bankBalance,
        companyId,
        bankAccount
      );
    } catch (error) {
      console.error('Error in getBankReconciliationStatement:', error);
      throw error;
    }
  }
}

const bankReconciliationController = new BankReconciliationController();

const getBankReconciliation = async (req, res) => {
  try {
    const { companyid, bankaccount } = req.query;

    if (!companyid) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['companyid', 'bankaccount']
      });
    }

    const companyId = parseInt(companyid);
    if (isNaN(companyId)) {
      return res.status(400).json({
        error: 'Invalid company ID',
        message: 'Company ID must be a valid number'
      });
    }

    // Validate bankaccount if provided - should be a string and not a number
    if (bankaccount && (typeof bankaccount !== 'string' || /^\d+$/.test(bankaccount))) {
      return res.status(400).json({
        error: 'Invalid bank account',
        message: 'Bank account must be a valid bank account name'
      });
    }

    const reconciliationStatement = await bankReconciliationController.getBankReconciliationStatement(
      companyId, 
      bankaccount || null
    );
    
    res.json(reconciliationStatement);
  } catch (error) {
    console.error('Error in getBankReconciliation:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to generate bank reconciliation statement'
    });
  }
};

module.exports = {
  getBankReconciliation
};