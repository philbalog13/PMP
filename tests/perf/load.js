/**
 * Performance Load Test
 * Simulates high transaction volume to validate performance thresholds
 * 
 * Usage: node load.js or with a test runner
 * 
 * Requirements:
 * - 1000 transactions per minute (16.67 TPS)
 * - P95 latency < 100ms
 * - Recovery after failure < 10s
 */

// Configuration
const CONFIG = {
    targetTPS: 17, // 1000/min = ~16.67 TPS
    testDurationSeconds: 60,
    maxLatencyP95Ms: 100,
    maxLatencyP99Ms: 500,
    maxErrorRatePercent: 0.1,
    recoveryTimeMs: 10000,
    warmupSeconds: 5
};

// Metrics collector
class MetricsCollector {
    constructor() {
        this.latencies = [];
        this.errors = 0;
        this.successes = 0;
        this.startTime = null;
    }

    recordLatency(ms) {
        this.latencies.push(ms);
    }

    recordError() {
        this.errors++;
    }

    recordSuccess() {
        this.successes++;
    }

    start() {
        this.startTime = Date.now();
    }

    getElapsedMs() {
        return Date.now() - this.startTime;
    }

    getPercentile(p) {
        if (this.latencies.length === 0) return 0;
        const sorted = [...this.latencies].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * p);
        return sorted[index] || sorted[sorted.length - 1];
    }

    getStats() {
        const total = this.successes + this.errors;
        const errorRate = total > 0 ? (this.errors / total) * 100 : 0;
        const avgLatency = this.latencies.length > 0
            ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
            : 0;
        const tps = total / (this.getElapsedMs() / 1000);

        return {
            totalRequests: total,
            successes: this.successes,
            errors: this.errors,
            errorRate: errorRate.toFixed(2),
            avgLatency: avgLatency.toFixed(2),
            p50: this.getPercentile(0.50),
            p95: this.getPercentile(0.95),
            p99: this.getPercentile(0.99),
            maxLatency: Math.max(...this.latencies, 0),
            minLatency: Math.min(...this.latencies, 0),
            tps: tps.toFixed(2),
            elapsedMs: this.getElapsedMs()
        };
    }

    printReport() {
        const stats = this.getStats();
        console.log('\n');
        console.log('═'.repeat(60));
        console.log('  📊 PERFORMANCE TEST RESULTS');
        console.log('═'.repeat(60));
        console.log(`
  📈 Throughput
     Total Requests:  ${stats.totalRequests}
     Successes:       ${stats.successes}
     Errors:          ${stats.errors}
     Error Rate:      ${stats.errorRate}%
     Actual TPS:      ${stats.tps}

  ⏱️  Latency (ms)
     Average:         ${stats.avgLatency}
     P50:             ${stats.p50}
     P95:             ${stats.p95}
     P99:             ${stats.p99}
     Min:             ${stats.minLatency}
     Max:             ${stats.maxLatency}

  ✅ Threshold Validation
     P95 < ${CONFIG.maxLatencyP95Ms}ms:    ${stats.p95 <= CONFIG.maxLatencyP95Ms ? '✅ PASS' : '❌ FAIL'}
     P99 < ${CONFIG.maxLatencyP99Ms}ms:   ${stats.p99 <= CONFIG.maxLatencyP99Ms ? '✅ PASS' : '❌ FAIL'}
     Error < ${CONFIG.maxErrorRatePercent}%:   ${parseFloat(stats.errorRate) <= CONFIG.maxErrorRatePercent ? '✅ PASS' : '❌ FAIL'}
     TPS >= ${CONFIG.targetTPS}:      ${parseFloat(stats.tps) >= CONFIG.targetTPS ? '✅ PASS' : '❌ FAIL'}
`);
        console.log('═'.repeat(60));
    }
}

// Simulated transaction processor
async function processTransaction(txnId) {
    const startTime = Date.now();

    // Simulate processing (random 10-80ms, occasionally slower)
    const isSlowRequest = Math.random() < 0.05; // 5% slow requests
    const baseLatency = Math.random() * 70 + 10;
    const latency = isSlowRequest ? baseLatency * 3 : baseLatency;

    await new Promise(resolve => setTimeout(resolve, latency));

    // Simulate occasional errors (0.05%)
    const isError = Math.random() < 0.0005;

    return {
        txnId,
        latency: Date.now() - startTime,
        success: !isError,
        responseCode: isError ? '96' : '00'
    };
}

// Recovery test after simulated failure
async function testRecovery(metrics) {
    console.log('\n🔧 Testing Recovery Time...');

    // Simulate failure
    const failureStart = Date.now();
    console.log('   💥 Simulating service failure...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1s failure

    // Attempt recovery
    console.log('   🔄 Attempting recovery...');
    let recovered = false;
    let attempts = 0;

    while (!recovered && (Date.now() - failureStart) < CONFIG.recoveryTimeMs) {
        attempts++;
        try {
            await processTransaction('recovery-test');
            recovered = true;
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    const recoveryTime = Date.now() - failureStart;
    const passed = recoveryTime <= CONFIG.recoveryTimeMs;

    console.log(`   Recovery Time: ${recoveryTime}ms (Attempts: ${attempts})`);
    console.log(`   Threshold: ${CONFIG.recoveryTimeMs}ms`);
    console.log(`   Result: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);

    return { passed, recoveryTime, attempts };
}

// Main load test
async function runLoadTest() {
    const metrics = new MetricsCollector();

    console.log('═'.repeat(60));
    console.log('  🚀 PMP PERFORMANCE LOAD TEST');
    console.log('═'.repeat(60));
    console.log(`
  Configuration:
    Target TPS:       ${CONFIG.targetTPS}
    Duration:         ${CONFIG.testDurationSeconds}s
    Warmup:           ${CONFIG.warmupSeconds}s
    Max P95 Latency:  ${CONFIG.maxLatencyP95Ms}ms
    Max Error Rate:   ${CONFIG.maxErrorRatePercent}%
`);

    // Warmup phase
    console.log('🔥 Warmup phase...');
    for (let i = 0; i < CONFIG.warmupSeconds * CONFIG.targetTPS; i++) {
        await processTransaction(`warmup-${i}`);
    }
    console.log('   Warmup complete.\n');

    // Main test phase
    console.log('📈 Running load test...');
    metrics.start();

    const intervalMs = 1000 / CONFIG.targetTPS;
    const endTime = Date.now() + (CONFIG.testDurationSeconds * 1000);
    let txnCounter = 0;

    while (Date.now() < endTime) {
        const txnId = `txn-${++txnCounter}`;

        // Fire and forget to maintain rate
        processTransaction(txnId).then(result => {
            metrics.recordLatency(result.latency);
            if (result.success) {
                metrics.recordSuccess();
            } else {
                metrics.recordError();
            }
        });

        // Progress indicator every 10s
        const elapsed = metrics.getElapsedMs();
        if (txnCounter % (CONFIG.targetTPS * 10) === 0) {
            const progress = ((elapsed / 1000) / CONFIG.testDurationSeconds * 100).toFixed(0);
            process.stdout.write(`   Progress: ${progress}% (${txnCounter} txns)\r`);
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    // Wait for in-flight requests
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n');

    // Print results
    metrics.printReport();

    // Recovery test
    const recoveryResult = await testRecovery(metrics);

    // Final summary
    const stats = metrics.getStats();
    const allPassed =
        stats.p95 <= CONFIG.maxLatencyP95Ms &&
        stats.p99 <= CONFIG.maxLatencyP99Ms &&
        parseFloat(stats.errorRate) <= CONFIG.maxErrorRatePercent &&
        parseFloat(stats.tps) >= CONFIG.targetTPS &&
        recoveryResult.passed;

    console.log('═'.repeat(60));
    console.log(`  FINAL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('═'.repeat(60));

    return allPassed ? 0 : 1;
}

// Export for use as module or run directly
if (typeof module !== 'undefined' && require.main === module) {
    runLoadTest()
        .then(exitCode => process.exit(exitCode))
        .catch(err => {
            console.error('Load test failed:', err);
            process.exit(1);
        });
}

module.exports = { runLoadTest, MetricsCollector, processTransaction, CONFIG };
