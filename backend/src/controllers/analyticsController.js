/**
 * src/controllers/analyticsController.js
 * Handles analytics endpoints for transaction volume insights.
 */

"use strict";

const analyticsService = require("../services/analyticsService");

/**
 * GET /api/analytics/:publicKey/summary
 * Returns: total sent, received, unique counterparties, avg transaction size.
 */
async function getSummary(req, res, next) {
  try {
    const { publicKey } = req.params;
    const data = await analyticsService.getSummary(publicKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/:publicKey/top-recipients
 * Returns: top 5 addresses by total XLM sent.
 */
async function getTopRecipients(req, res, next) {
  try {
    const { publicKey } = req.params;
    const data = await analyticsService.getTopRecipients(publicKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/:publicKey/activity
 * Returns: payment count by day of week (all 7 days).
 */
async function getActivityByDay(req, res, next) {
  try {
    const { publicKey } = req.params;
    const data = await analyticsService.getActivityByDay(publicKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analytics/:publicKey/export-schedule
 * Set up recurring email export.
 */
async function scheduleExport(req, res, next) {
  try {
    const { publicKey } = req.params;
    const { email, frequency } = req.body;
    const data = analyticsService.scheduleExport(publicKey, email, frequency);
    res.status(201).json({ success: true, data, message: "Recurring export scheduled successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/:publicKey/export-schedule
 * Get scheduled export configuration.
 */
async function getExportSchedule(req, res, next) {
  try {
    const { publicKey } = req.params;
    const data = analyticsService.getExportSchedule(publicKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analytics/:publicKey/export-trigger
 * Manually trigger sending export email.
 */
async function triggerExport(req, res, next) {
  try {
    const { publicKey } = req.params;
    const data = await analyticsService.triggerEmailExport(publicKey);
    res.json({ success: true, data, message: "Export email sent" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getTopRecipients,
  getActivityByDay,
  scheduleExport,
  getExportSchedule,
  triggerExport,
};
