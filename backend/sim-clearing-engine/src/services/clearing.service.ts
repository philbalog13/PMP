import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const pool = new Pool({ connectionString: config.databaseUrl });

export interface BatchTransaction {
    transactionId: string;
    panMasked: string;
    amount: number;
    currency: string;
    responseCode: string;
    transactionType: string;
    authorizedAt: string;
    stan?: string;
}

export interface BatchFile {
    terminalId: string;
    merchantId: string;
    transactions: BatchTransaction[];
    submittedAt?: string;
}

export interface ReconciliationResult {
    batchId: string;
    status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
    transactionCount: number;
    reconciledCount: number;
    totalAmount: number;
    discrepancyAmount: number;
    discrepancies: string[];
    processedAt: string;
    _educational: {
        description: string;
        isoFlow: string;
        steps: string[];
    };
}

/**
 * Submit and process a batch of transactions from a POS terminal.
 * Simulates the "Télécollecte" (End-of-Day Clearing) process in real payment networks.
 */
export const processBatch = async (batch: BatchFile): Promise<ReconciliationResult> => {
    const batchId = uuidv4();
    const processedAt = new Date().toISOString();
    const discrepancies: string[] = [];
    let reconciledCount = 0;
    let totalAmount = 0;
    let discrepancyAmount = 0;

    console.log(`[CLEARING] Starting batch processing for terminal ${batch.terminalId}, ${batch.transactions.length} transactions`);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert batch file record
        await client.query(
            `INSERT INTO clearing.batch_files
             (id, terminal_id, merchant_id, submitted_at, status, transaction_count, total_amount)
             VALUES ($1, $2, $3, NOW(), 'PROCESSING', $4, 0)`,
            [batchId, batch.terminalId, batch.merchantId, batch.transactions.length]
        );

        // Process each transaction in the batch
        for (const txn of batch.transactions) {
            totalAmount += txn.amount;

            // Verify transaction exists in DB (reconciliation against auth_requests)
            let reconciled = false;
            let dbTxnAmount = 0;

            try {
                const dbResult = await client.query(
                    `SELECT amount, status, response_code FROM transactions.auth_requests
                     WHERE id::text = $1 OR (stan = $2 AND merchant_id = $3)
                     LIMIT 1`,
                    [txn.transactionId, txn.stan || '', batch.merchantId]
                );

                if (dbResult.rows.length > 0) {
                    const dbTxn = dbResult.rows[0];
                    dbTxnAmount = parseFloat(dbTxn.amount);

                    if (dbTxn.status === 'APPROVED' && dbTxn.response_code === '00') {
                        if (Math.abs(dbTxnAmount - txn.amount) < 0.01) {
                            reconciled = true;
                            reconciledCount++;
                        } else {
                            const diff = Math.abs(dbTxnAmount - txn.amount);
                            discrepancyAmount += diff;
                            discrepancies.push(
                                `TXN ${txn.transactionId}: amount mismatch — batch=${txn.amount}, db=${dbTxnAmount}`
                            );
                        }
                    } else {
                        discrepancies.push(
                            `TXN ${txn.transactionId}: not APPROVED in DB (status=${dbTxn.status})`
                        );
                    }
                } else {
                    // Transaction not found in DB — could be from in-memory POS (non-persisted)
                    // Accept if response code is '00' (trust-based for simulation)
                    if (txn.responseCode === '00') {
                        reconciled = true;
                        reconciledCount++;
                        console.log(`[CLEARING] TXN ${txn.transactionId} not in DB — accepted by responseCode trust`);
                    } else {
                        discrepancies.push(`TXN ${txn.transactionId}: not found in auth_requests`);
                    }
                }
            } catch (lookupError: any) {
                // DB lookup failed — fallback to trust-based reconciliation
                if (txn.responseCode === '00') {
                    reconciled = true;
                    reconciledCount++;
                }
                console.warn(`[CLEARING] DB lookup failed for TXN ${txn.transactionId}: ${lookupError.message}`);
            }

            // Insert batch transaction record
            await client.query(
                `INSERT INTO clearing.batch_transactions
                 (id, batch_id, transaction_id, pan_masked, amount, currency, response_code, transaction_type, authorized_at, reconciled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    uuidv4(), batchId,
                    txn.transactionId || null,
                    txn.panMasked, txn.amount, txn.currency,
                    txn.responseCode, txn.transactionType,
                    txn.authorizedAt || new Date().toISOString(),
                    reconciled
                ]
            );
        }

        // Update batch with final results
        const finalStatus = discrepancies.length === 0 ? 'COMPLETED'
            : reconciledCount > 0 ? 'PARTIAL' : 'FAILED';

        await client.query(
            `UPDATE clearing.batch_files SET
             status = $1, processed_at = NOW(), reconciled_count = $2,
             discrepancy_amount = $3, total_amount = $4
             WHERE id = $5`,
            [finalStatus, reconciledCount, discrepancyAmount, totalAmount, batchId]
        );

        await client.query('COMMIT');
        console.log(`[CLEARING] Batch ${batchId} processed: ${reconciledCount}/${batch.transactions.length} reconciled, status=${finalStatus}`);

        return {
            batchId,
            status: finalStatus,
            transactionCount: batch.transactions.length,
            reconciledCount,
            totalAmount,
            discrepancyAmount,
            discrepancies,
            processedAt,
            _educational: {
                description: 'Télécollecte (ISO 8583 TC33): processus de compensation en fin de journée bancaire',
                isoFlow: 'POS Terminal → Acquéreur → Réseau Monétique → Compensation Interbancaire → Règlement',
                steps: [
                    `1. POS envoie ${batch.transactions.length} transactions au moteur de compensation`,
                    `2. Vérification croisée avec la base d'autorisation (transactions.auth_requests)`,
                    `3. ${reconciledCount} transactions rapprochées sur ${batch.transactions.length}`,
                    `4. Montant total à régler: ${totalAmount.toFixed(2)} EUR`,
                    discrepancyAmount > 0 ? `5. ⚠️ Écart détecté: ${discrepancyAmount.toFixed(2)} EUR` : `5. ✅ Aucun écart détecté`
                ]
            }
        };

    } catch (error: any) {
        await client.query('ROLLBACK');
        // Mark batch as failed
        await pool.query(
            `UPDATE clearing.batch_files SET status = 'FAILED', processed_at = NOW() WHERE id = $1`,
            [batchId]
        ).catch(() => { });
        console.error(`[CLEARING] Batch ${batchId} failed:`, error.message);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * List all batch runs with summary
 */
export const listBatches = async (limit: number = 20): Promise<any[]> => {
    const result = await pool.query(
        `SELECT id, terminal_id, merchant_id, submitted_at, processed_at, status,
                transaction_count, reconciled_count, total_amount, discrepancy_amount
         FROM clearing.batch_files
         ORDER BY submitted_at DESC LIMIT $1`,
        [limit]
    );
    return result.rows;
};

/**
 * Get details of a specific batch including all transactions
 */
export const getBatchDetail = async (batchId: string): Promise<any | null> => {
    const batchResult = await pool.query(
        `SELECT * FROM clearing.batch_files WHERE id = $1`,
        [batchId]
    );
    if (batchResult.rows.length === 0) return null;

    const txnResult = await pool.query(
        `SELECT * FROM clearing.batch_transactions WHERE batch_id = $1 ORDER BY authorized_at`,
        [batchId]
    );

    return {
        ...batchResult.rows[0],
        transactions: txnResult.rows
    };
};

/**
 * Get clearing balance per merchant (net settled amounts)
 */
export const getClearingBalance = async (merchantId?: string): Promise<any[]> => {
    const query = merchantId
        ? `SELECT merchant_id, SUM(total_amount) as total_cleared, COUNT(*) as batch_count,
                  MAX(processed_at) as last_cleared_at
           FROM clearing.batch_files
           WHERE status IN ('COMPLETED', 'PARTIAL') AND merchant_id = $1
           GROUP BY merchant_id`
        : `SELECT merchant_id, SUM(total_amount) as total_cleared, COUNT(*) as batch_count,
                  MAX(processed_at) as last_cleared_at
           FROM clearing.batch_files
           WHERE status IN ('COMPLETED', 'PARTIAL')
           GROUP BY merchant_id ORDER BY total_cleared DESC`;

    const result = await pool.query(query, merchantId ? [merchantId] : []);
    return result.rows;
};
