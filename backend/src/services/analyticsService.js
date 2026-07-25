/**
 * src/services/analyticsService.js
 * Business logic for transaction volume analytics.
 * Fetches payment data from Horizon and computes aggregated insights.
 * Includes in-memory caching with 5-minute TTL.
 */

"use strict";

const stellarService = require("./stellarService");

// ─── Cache Configuration ──────────────────────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const cache = new Map();

/**
 * Cache wrapper function.
 * @param {string} key
 * @param {Function} fn - async function that returns the data
 */
async function withCache(key, fn) {
  const cached = cache.get(key);

  // Return cached data if still fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch fresh data
  const data = await fn();

  // Update cache
  cache.set(key, { data, timestamp: Date.now() });

  return data;
}

// ─── Analytics Functions ──────────────────────────────────────────────────────

/**
 * Get summary analytics for a public key.
 * Returns: total sent, total received, unique counterparties, avg transaction size, and week-over-week comparison deltas.
 */
async function getSummary(publicKey) {
  return withCache(`summary:${publicKey}`, async () => {
    const payments = await stellarService.getPayments(publicKey, { limit: 200 });

    let totalSent = 0;
    let totalReceived = 0;
    const counterparties = new Set();
    let transactionCount = 0;

    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

    let thisWeekCount = 0;
    let lastWeekCount = 0;
    let thisWeekVolume = 0;
    let lastWeekVolume = 0;

    for (const payment of payments) {
      const amount = parseFloat(payment.amount);
      const paymentTime = new Date(payment.createdAt).getTime();

      if (payment.type === "sent") {
        totalSent += amount;
        counterparties.add(payment.to);
      } else {
        totalReceived += amount;
        counterparties.add(payment.from);
      }
      transactionCount++;

      // Week-over-week breakdown
      if (now - paymentTime <= oneWeekMs) {
        thisWeekCount++;
        thisWeekVolume += amount;
      } else if (now - paymentTime <= twoWeeksMs) {
        lastWeekCount++;
        lastWeekVolume += amount;
      }
    }

    const totalVolume = totalSent + totalReceived;
    const avgTransactionSize =
      transactionCount > 0 ? (totalVolume / transactionCount).toFixed(7) : "0";

    // Compute percentage deltas
    let countChangePercent = 0;
    if (lastWeekCount > 0) {
      countChangePercent = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
    } else if (thisWeekCount > 0) {
      countChangePercent = 100; // 100% increase if last week was 0
    }

    let volumeChangePercent = 0;
    if (lastWeekVolume > 0) {
      volumeChangePercent = Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100);
    } else if (thisWeekVolume > 0) {
      volumeChangePercent = 100;
    }

    return {
      publicKey,
      totalSentXLM: totalSent.toFixed(7),
      totalReceivedXLM: totalReceived.toFixed(7),
      uniqueCounterparties: counterparties.size,
      averageTransactionSize: avgTransactionSize,
      totalTransactions: transactionCount,
      comparison: {
        thisWeekCount,
        lastWeekCount,
        countChangePercent,
        thisWeekVolume: thisWeekVolume.toFixed(7),
        lastWeekVolume: lastWeekVolume.toFixed(7),
        volumeChangePercent,
      },
    };
  });
}

/**
 * Get top 5 recipients by total XLM sent.
 */
async function getTopRecipients(publicKey) {
  return withCache(`top-recipients:${publicKey}`, async () => {
    const payments = await stellarService.getPayments(publicKey, { limit: 200 });

    // Map to track total sent per recipient
    const recipientTotals = new Map();

    for (const payment of payments) {
      // Only count sent payments
      if (payment.type === "sent") {
        const amount = parseFloat(payment.amount);
        const recipient = payment.to;

        if (recipientTotals.has(recipient)) {
          recipientTotals.set(
            recipient,
            recipientTotals.get(recipient) + amount
          );
        } else {
          recipientTotals.set(recipient, amount);
        }
      }
    }

    // Convert to array and sort by amount (descending)
    const sorted = Array.from(recipientTotals.entries())
      .map(([address, total]) => ({
        address,
        totalXLMSent: total.toFixed(7),
      }))
      .sort((a, b) => parseFloat(b.totalXLMSent) - parseFloat(a.totalXLMSent))
      .slice(0, 5); // Top 5 only

    return {
      publicKey,
      topRecipients: sorted,
      count: sorted.length,
    };
  });
}

/**
 * Get payment activity by day of week.
 * Returns counts for all 7 days (Sunday = 0, ... Saturday = 6).
 */
async function getActivityByDay(publicKey) {
  return withCache(`activity:${publicKey}`, async () => {
    const payments = await stellarService.getPayments(publicKey, { limit: 200 });

    // Initialize counters for all 7 days
    const dayActivity = {
      0: 0, // Sunday
      1: 0, // Monday
      2: 0, // Tuesday
      3: 0, // Wednesday
      4: 0, // Thursday
      5: 0, // Friday
      6: 0, // Saturday
    };

    // Count transactions by day of week
    for (const payment of payments) {
      const date = new Date(payment.createdAt);
      const dayOfWeek = date.getUTCDay();
      dayActivity[dayOfWeek]++;
    }

    // Convert to array format
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const activity = days.map((dayName, index) => ({
      day: dayName,
      dayIndex: index,
      transactionCount: dayActivity[index],
    }));

    return {
      publicKey,
      activityByDay: activity,
    };
  });
}

const emailService = require("./emailService");

// In-memory store for scheduled exports: Map<publicKey, { email, frequency, nextRunAt }>
const exportSchedules = new Map();

/**
 * Opt-in/schedule a recurring email export.
 */
function scheduleExport(publicKey, email, frequency) {
  if (!publicKey || !email || !frequency) {
    const error = new Error("publicKey, email, and frequency are required");
    error.status = 400;
    throw error;
  }
  if (!["daily", "weekly"].includes(frequency.toLowerCase())) {
    const error = new Error("frequency must be 'daily' or 'weekly'");
    error.status = 400;
    throw error;
  }

  const nextRunAt = new Date();
  if (frequency.toLowerCase() === "daily") {
    nextRunAt.setUTCDate(nextRunAt.getUTCDate() + 1);
  } else {
    nextRunAt.setUTCDate(nextRunAt.getUTCDate() + 7);
  }

  const schedule = {
    publicKey,
    email,
    frequency: frequency.toLowerCase(),
    nextRunAt: nextRunAt.toISOString(),
  };

  exportSchedules.set(publicKey, schedule);
  return schedule;
}

/**
 * Get scheduled export for a public key.
 */
function getExportSchedule(publicKey) {
  return exportSchedules.get(publicKey) || null;
}

/**
 * Manually trigger/run the email export for testing or scheduled job runner.
 */
async function triggerEmailExport(publicKey) {
  const schedule = exportSchedules.get(publicKey);
  if (!schedule) {
    const error = new Error("No export schedule found for this public key");
    error.status = 404;
    throw error;
  }

  // Fetch summary, top recipients, activity
  const [summary, topRecipients, activity] = await Promise.all([
    getSummary(publicKey),
    getTopRecipients(publicKey),
    getActivityByDay(publicKey),
  ]);

  const htmlContent = `
    <h1>Stellar MicroPay Summary Data Export</h1>
    <p>PublicKey: <code>${publicKey}</code></p>
    
    <h2>Summary Statistics</h2>
    <ul>
      <li>Total Sent: ${summary.totalSentXLM} XLM</li>
      <li>Total Received: ${summary.totalReceivedXLM} XLM</li>
      <li>Unique Counterparties: ${summary.uniqueCounterparties}</li>
      <li>Average Transaction Size: ${summary.averageTransactionSize} XLM</li>
      <li>Total Transactions: ${summary.totalTransactions}</li>
    </ul>

    <h2>Top Recipients</h2>
    <ol>
      ${topRecipients.topRecipients.map(r => `<li><code>${r.address}</code>: ${r.totalXLMSent} XLM</li>`).join("")}
    </ol>

    <h2>Weekly Activity</h2>
    <ul>
      ${activity.activityByDay.map(d => `<li>${d.day}: ${d.transactionCount} payments</li>`).join("")}
    </ul>
  `;

  await emailService.sendEmail({
    to: schedule.email,
    subject: `Stellar MicroPay Summary Export (${schedule.frequency})`,
    html: htmlContent,
  });

  return { success: true };
}

/**
 * Clear cache for a specific public key (optional helper).
 * Useful for manual cache invalidation if needed.
 */
function clearCache(publicKey) {
  cache.delete(`summary:${publicKey}`);
  cache.delete(`top-recipients:${publicKey}`);
  cache.delete(`activity:${publicKey}`);
}

module.exports = {
  getSummary,
  getTopRecipients,
  getActivityByDay,
  clearCache,
  scheduleExport,
  getExportSchedule,
  triggerEmailExport,
};
