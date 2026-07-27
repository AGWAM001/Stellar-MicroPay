"use strict";

const crypto = require("crypto");
const { Horizon } = require("@stellar/stellar-sdk");
const logger = require("../utils/logger");
require("dotenv").config();

const HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(HORIZON_URL);

// In-memory store: { id, publicKey, url, secret, createdAt }
const webhooks = new Map();
let nextId = 1;

// Multi-sig reminder state
const multiSigReminders = new Map(); // { unsignedXDR: { signers: Set<publicKey>, reminderSent: boolean, createdAt, threshold } }
const REMINDER_DELAY_MS = parseInt(process.env.MULTISIG_REMINDER_DELAY_MS || "300000"); // Default 5 minutes

function registerWebhook(publicKey, url, secret) {
  const id = String(nextId++);
  const webhook = { id, publicKey, url, secret, createdAt: new Date().toISOString() };
  webhooks.set(id, webhook);
  startMonitoring(webhook);
  logger.info(JSON.stringify({ type: "webhook_registered", id, publicKey, url }));
  return webhook;
}

function getWebhooksByPublicKey(publicKey) {
  return Array.from(webhooks.values()).filter(w => w.publicKey === publicKey);
}

function deleteWebhook(id) {
  const exists = webhooks.has(id);
  if (exists) {
    webhooks.delete(id);
    logger.info(JSON.stringify({ type: "webhook_deleted", id }));
  }
  return exists;
}

function signPayload(secret, payload) {
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

async function deliverWebhook(webhook, payload) {
  const signature = signPayload(webhook.secret, payload);
  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.error(JSON.stringify({ type: "webhook_delivery_failed", id: webhook.id, status: res.status, url: webhook.url }));
    } else {
      logger.info(JSON.stringify({ type: "webhook_delivered", id: webhook.id, url: webhook.url }));
    }
  } catch (err) {
    logger.error(JSON.stringify({ type: "webhook_delivery_error", id: webhook.id, url: webhook.url, error: err.message }));
  }
}

const activeStreams = new Map();

function startMonitoring(webhook) {
  if (activeStreams.has(webhook.publicKey)) return;

  const closeStream = server
    .payments()
    .forAccount(webhook.publicKey)
    .cursor("now")
    .stream({
      onmessage: async (payment) => {
        if (payment.type !== "payment" || payment.to !== webhook.publicKey) return;
        const payload = {
          event: "payment.received",
          publicKey: webhook.publicKey,
          payment: {
            id: payment.id,
            from: payment.from,
            to: payment.to,
            amount: payment.amount,
            asset: payment.asset_type === "native" ? "XLM" : payment.asset_code,
            createdAt: payment.created_at,
          },
        };
        const hooks = getWebhooksByPublicKey(webhook.publicKey);
        for (const hook of hooks) {
          await deliverWebhook(hook, payload);
        }
      },
      onerror: (err) => {
        logger.error(JSON.stringify({ type: "horizon_sse_error", publicKey: webhook.publicKey, error: err.message }));
        activeStreams.delete(webhook.publicKey);
      },
    });

  activeStreams.set(webhook.publicKey, closeStream);
  logger.info(JSON.stringify({ type: "horizon_monitoring_started", publicKey: webhook.publicKey }));
}

// Multi-sig reminder functions

/**
 * Register a multi-sig transaction for reminder tracking
 * @param {string} unsignedXDR - The unsigned transaction XDR
 * @param {Array<string>} signers - Array of signer public keys who need to sign
 * @param {number} threshold - Required signature threshold
 * @returns {Object} The reminder tracking object
 */
function registerMultiSigReminder(unsignedXDR, signers, threshold) {
  if (!unsignedXDR || typeof unsignedXDR !== "string") {
    throw new Error("unsignedXDR is required and must be a string");
  }
  if (!Array.isArray(signers) || signers.length === 0) {
    throw new Error("signers must be a non-empty array");
  }
  if (typeof threshold !== "number" || threshold < 2) {
    throw new Error("threshold must be a number >= 2");
  }

  const reminder = {
    signers: new Set(signers),
    signedSigners: new Set(),
    reminderSent: false,
    createdAt: Date.now(),
    threshold,
  };
  
  multiSigReminders.set(unsignedXDR, reminder);
  logger.info(JSON.stringify({ type: "multisig_reminder_registered", signersCount: signers.length, threshold }));
  
  // Start the reminder timer
  scheduleReminder(unsignedXDR);
  
  return reminder;
}

/**
 * Schedule a reminder to be sent after the configurable delay
 */
function scheduleReminder(unsignedXDR) {
  setTimeout(async () => {
    const current = multiSigReminders.get(unsignedXDR);
    if (!current || current.reminderSent) return;
    
    // Check if threshold is already met
    if (current.signedSigners.size >= current.threshold) {
      multiSigReminders.delete(unsignedXDR);
      return;
    }
    
    // Find signers who haven't signed yet
    const pendingSigners = Array.from(current.signers).filter(
      signer => !current.signedSigners.has(signer)
    );
    
    if (pendingSigners.length === 0) {
      multiSigReminders.delete(unsignedXDR);
      return;
    }
    
    // Send reminder webhook to each pending signer
    for (const signer of pendingSigners) {
      const hooks = getWebhooksByPublicKey(signer);
      const payload = {
        event: "multisig.signature_pending",
        publicKey: signer,
        unsignedXDR,
        threshold: current.threshold,
        signaturesCollected: current.signedSigners.size,
        pendingSigners,
        createdAt: current.createdAt,
      };
      
      for (const hook of hooks) {
        await deliverWebhook(hook, payload);
      }
    }
    
    current.reminderSent = true;
    logger.info(JSON.stringify({ type: "multisig_reminder_sent", pendingSignersCount: pendingSigners.length }));
  }, REMINDER_DELAY_MS);
}

/**
 * Mark a signer as having signed the transaction
 * @param {string} unsignedXDR - The unsigned transaction XDR
 * @param {string} signerPublicKey - The public key of the signer
 * @returns {boolean} True if the threshold is now met
 */
function markMultiSigSigned(unsignedXDR, signerPublicKey) {
  const reminder = multiSigReminders.get(unsignedXDR);
  if (!reminder) return false;
  
  reminder.signedSigners.add(signerPublicKey);
  
  // Check if threshold is met
  if (reminder.signedSigners.size >= reminder.threshold) {
    multiSigReminders.delete(unsignedXDR);
    logger.info(JSON.stringify({ type: "multisig_threshold_met", unsignedXDR }));
    return true;
  }
  
  return false;
}

/**
 * Cancel a multi-sig reminder (e.g., transaction cancelled or submitted)
 * @param {string} unsignedXDR - The unsigned transaction XDR
 * @returns {boolean} True if the reminder was cancelled
 */
function cancelMultiSigReminder(unsignedXDR) {
  const existed = multiSigReminders.has(unsignedXDR);
  if (existed) {
    multiSigReminders.delete(unsignedXDR);
    logger.info(JSON.stringify({ type: "multisig_reminder_cancelled", unsignedXDR }));
  }
  return existed;
}

module.exports = { 
  registerWebhook, 
  getWebhooksByPublicKey, 
  deleteWebhook,
  registerMultiSigReminder,
  markMultiSigSigned,
  cancelMultiSigReminder
};
