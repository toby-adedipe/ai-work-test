const express = require('express');
const router = express.Router();

const cashflowController = require('../controllers/cashflow');
const reconciliationController = require('../controllers/reconciliation');

/**
 * @swagger
 * /api/cashflow:
 *   get:
 *     summary: Get cash flow statement
 *     description: Retrieve cash flow statement classified by operating, investing, and financing activities
 *     parameters:
 *       - in: query
 *         name: companyid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *         example: 1
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for cash flow period
 *         example: "2025-01-01"
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for cash flow period
 *         example: "2025-01-31"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     fromDate:
 *                       type: string
 *                       format: date
 *                     toDate:
 *                       type: string
 *                       format: date
 *                     companyId:
 *                       type: integer
 *                 operatingActivities:
 *                   type: object
 *                   properties:
 *                     inflows:
 *                       type: array
 *                       items:
 *                         type: object
 *                     outflows:
 *                       type: array
 *                       items:
 *                         type: object
 *                     netOperatingCashFlow:
 *                       type: number
 *                 investingActivities:
 *                   type: object
 *                   properties:
 *                     inflows:
 *                       type: array
 *                       items:
 *                         type: object
 *                     outflows:
 *                       type: array
 *                       items:
 *                         type: object
 *                     netInvestingCashFlow:
 *                       type: number
 *                 financingActivities:
 *                   type: object
 *                   properties:
 *                     inflows:
 *                       type: array
 *                       items:
 *                         type: object
 *                     outflows:
 *                       type: array
 *                       items:
 *                         type: object
 *                     netFinancingCashFlow:
 *                       type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalCashInflows:
 *                       type: number
 *                     totalCashOutflows:
 *                       type: number
 *                     netChangeInCash:
 *                       type: number
 *                     openingCashBalance:
 *                       type: number
 *                     closingCashBalance:
 *                       type: number
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 required:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/cashflow', cashflowController.getCashFlowStatement);

/**
 * @swagger
 * /api/bank-reconciliation:
 *   get:
 *     summary: Get bank reconciliation statement
 *     description: Retrieve bank reconciliation statement with reconciling items
 *     parameters:
 *       - in: query
 *         name: companyid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *         example: 1
 *       - in: query
 *         name: bankaccount
 *         required: true
 *         schema:
 *           type: string
 *         description: Bank account name
 *         example: "MainBank"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 companyId:
 *                   type: integer
 *                 bankAccount:
 *                   type: string
 *                 asOfDate:
 *                   type: string
 *                   format: date
 *                 ledgerBalance:
 *                   type: number
 *                 bankStatementBalance:
 *                   type: number
 *                 reconcilingItems:
 *                   type: object
 *                   properties:
 *                     outstandingChecks:
 *                       type: array
 *                       items:
 *                         type: object
 *                     depositsInTransit:
 *                       type: array
 *                       items:
 *                         type: object
 *                     bankChargesNotRecorded:
 *                       type: array
 *                       items:
 *                         type: object
 *                     other:
 *                       type: array
 *                       items:
 *                         type: object
 *                 adjustedLedgerBalance:
 *                   type: number
 *                 adjustedBankBalance:
 *                   type: number
 *                 isReconciled:
 *                   type: boolean
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 required:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/bank-reconciliation', reconciliationController.getBankReconciliation);

module.exports = router;