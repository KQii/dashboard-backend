import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { APIFeatures } from "../utils/apiFeatures";
import alertmanagerService from "../services/alertmanager.service";

/**
 * Get all alerts
 */
export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const allAlerts = await alertmanagerService.getAlerts();

  const features = new APIFeatures(allAlerts, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const alerts = features.data;
  const metadata = features.getMetadata();

  return res.json({ success: true, data: alerts, pagination: metadata });
});

export const getAlertLabels = asyncHandler(
  async (req: Request, res: Response) => {
    const labels = await alertmanagerService.getAlertLabels();
    return res.json({ success: true, data: labels });
  }
);

export const getChannels = asyncHandler(async (req: Request, res: Response) => {
  const silences = await alertmanagerService.getChannels();
  return res.json({ success: true, data: silences });
});

/**
 * Get alert groups
 */
export const getAlertGroups = asyncHandler(
  async (req: Request, res: Response) => {
    const { filter } = req.query;
    const groups = await alertmanagerService.getAlertGroups(
      filter as string | undefined
    );
    return res.json({ success: true, data: groups });
  }
);

/**
 * Post alerts to Alertmanager
 */
export const postAlerts = asyncHandler(async (req: Request, res: Response) => {
  const alerts = req.body;

  if (!Array.isArray(alerts)) {
    return res.status(400).json({
      success: false,
      error: "Request body must be an array of alerts",
    });
  }

  await alertmanagerService.postAlerts(alerts);
  return res.json({ success: true, message: "Alerts posted successfully" });
});

/**
 * Get all silences
 */
export const getSilences = asyncHandler(async (req: Request, res: Response) => {
  const allSilences = await alertmanagerService.getSilences();

  const features = new APIFeatures(allSilences, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const silences = features.data;
  const metadata = features.getMetadata();

  return res.json({ success: true, data: silences, pagination: metadata });
});

/**
 * Get a specific silence by ID
 */
export const getSilence = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const silence = await alertmanagerService.getSilence(id);
  return res.json({ success: true, data: silence });
});

/**
 * Create a new silence
 */
export const createSilence = asyncHandler(
  async (req: Request, res: Response) => {
    const silence = req.body;

    if (
      !silence.matchers ||
      !silence.startsAt ||
      !silence.endsAt ||
      !silence.createdBy ||
      !silence.comment
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: matchers, startsAt, endsAt, createdBy, comment",
      });
    }

    const result = await alertmanagerService.createSilence(silence);
    return res.json({ success: true, data: result });
  }
);

/**
 * Delete a silence
 */
export const deleteSilence = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    await alertmanagerService.deleteSilence(id);
    return res.json({ success: true, message: "Silence deleted successfully" });
  }
);

/**
 * Get receivers
 */
export const getReceivers = asyncHandler(
  async (req: Request, res: Response) => {
    const receivers = await alertmanagerService.getReceivers();
    return res.json({ success: true, data: receivers });
  }
);

/**
 * Get Alertmanager status
 */
export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await alertmanagerService.getStatus();
  return res.json({ success: true, data: status });
});

/**
 * Check Alertmanager health
 */
export const checkHealth = asyncHandler(async (req: Request, res: Response) => {
  const health = await alertmanagerService.checkHealth();
  return res.json({ success: true, data: health });
});

export const reloadConfig = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await alertmanagerService.reloadConfig();
    return res.json({ success: true, data: result });
  }
);
