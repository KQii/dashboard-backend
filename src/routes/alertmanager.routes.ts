import { Router } from "express";
import * as alertmanagerController from "../controllers/alertmanager.controller";

const router = Router();

// Alert endpoints
router.get("/alerts", alertmanagerController.getAlerts);
router.get("/alerts/groups", alertmanagerController.getAlertGroups);
router.post("/alerts", alertmanagerController.postAlerts);

// Silence endpoints
router.get("/silences", alertmanagerController.getSilences);
router.get("/silence/:id", alertmanagerController.getSilence);
router.post("/silences", alertmanagerController.createSilence);
router.delete("/silence/:id", alertmanagerController.deleteSilence);

// Status endpoints
router.get("/receivers", alertmanagerController.getReceivers);
router.get("/status", alertmanagerController.getStatus);

// Health check
router.get("/health", alertmanagerController.checkHealth);

export default router;
