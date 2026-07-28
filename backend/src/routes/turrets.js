/**
 * src/routes/turrets.js
 * Turrets txFunctions API routes.
 */

"use strict";

const express = require("express");
const { strictLimiter } = require("../middleware/rateLimit");
const { verifyJWT } = require("../middleware/auth");
const controller = require("../controllers/turretsController");

const router = express.Router();

router.get("/", strictLimiter, controller.list);
router.post("/challenge", strictLimiter, controller.createChallenge);
router.post("/deploy", strictLimiter, verifyJWT, controller.deploy);
router.get("/audit/log", strictLimiter, controller.getAuditLog);
router.get("/:id", strictLimiter, controller.getOne);
router.get("/:id/history", strictLimiter, controller.getHistory);
router.post("/:id/pause", strictLimiter, verifyJWT, controller.pause);
router.post("/:id/resume", strictLimiter, verifyJWT, controller.resume);

module.exports = router;
