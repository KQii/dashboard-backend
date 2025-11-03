import { Router } from "express";
import * as prometheusController from "../controllers/prometheus.controller";

const router = Router();

router.get("/cluster-metrics", prometheusController.getClusterMetrics);
router.get("/cpu-metrics", prometheusController.getCPUMetrics);
router.get("/jvm-metrics", prometheusController.getJVMMetrics);
router.get("/rules", prometheusController.getRulesProcessed);

const rawRouter = Router();

// Query endpoints
rawRouter.get("/query", prometheusController.query);
rawRouter.get("/query_range", prometheusController.queryRange);

// Metadata endpoints
rawRouter.get("/labels", prometheusController.getLabels);
rawRouter.get("/label/:label/values", prometheusController.getLabelValues);
rawRouter.get("/metrics", prometheusController.getMetrics);
rawRouter.get("/series", prometheusController.getSeries);

// Status endpoints
rawRouter.get("/targets", prometheusController.getTargets);
rawRouter.get("/rules", prometheusController.getRules);
rawRouter.get("/alerts", prometheusController.getAlerts);

// Health check
rawRouter.get("/health", prometheusController.checkHealth);

router.use("/raw", rawRouter);

export default router;
