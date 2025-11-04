import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import prometheusService from "../services/prometheus.service";
import { APIFeatures } from "../utils/apiFeatures";

export const getClusterMetrics = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await prometheusService.getClusterMetrics();

    return res.json({ success: true, data: result });
  }
);

export const getCPUMetrics = asyncHandler(
  async (req: Request, res: Response) => {
    const { start, end, step } = req.query;

    if (!start || !end || !step) {
      return res.status(400).json({
        success: false,
        error: "start, end, and step parameters are required",
      });
    }

    const result = await prometheusService.getCPUMetrics(
      start as string,
      end as string,
      step as string
    );

    return res.json({ success: true, data: result });
  }
);

export const getJVMMetrics = asyncHandler(
  async (req: Request, res: Response) => {
    const { start, end, step } = req.query;

    if (!start || !end || !step) {
      return res.status(400).json({
        success: false,
        error: "start, end, and step parameters are required",
      });
    }

    const result = await prometheusService.getJVMMetrics(
      start as string,
      end as string,
      step as string
    );

    return res.json({ success: true, data: result });
  }
);

/**
 * Execute an instant query
 */
export const query = asyncHandler(async (req: Request, res: Response) => {
  const { query, time } = req.query;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: "Query parameter is required",
    });
  }

  const result = await prometheusService.query(
    query as string,
    time as string | undefined
  );

  return res.json({ success: true, data: result });
});

export const getRulesProcessed = asyncHandler(
  async (req: Request, res: Response) => {
    const allRules = await prometheusService.getRulesProcessed();

    // Apply filtering, sorting, field limiting, and pagination
    const features = new APIFeatures(allRules, req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const rules = features.data;
    const metadata = features.getMetadata();

    return res.json({
      success: true,
      data: rules,
      pagination: metadata,
    });
  }
);

export const getRuleGroups = asyncHandler(
  async (req: Request, res: Response) => {
    const groups = await prometheusService.getRuleGroups();

    return res.json({
      success: true,
      data: groups,
    });
  }
);

/**
 * Execute a range query
 */
export const queryRange = asyncHandler(async (req: Request, res: Response) => {
  const { query, start, end, step } = req.query;

  if (!query || !start || !end || !step) {
    return res.status(400).json({
      success: false,
      error: "Query, start, end, and step parameters are required",
    });
  }

  const result = await prometheusService.queryRange(
    query as string,
    start as string,
    end as string,
    step as string
  );

  return res.json({ success: true, data: result });
});

// Raw controller
/**
 * Get all labels
 */
export const getLabels = asyncHandler(async (req: Request, res: Response) => {
  const labels = await prometheusService.getLabels();
  return res.json({ success: true, data: labels });
});

/**
 * Get label values for a specific label
 */
export const getLabelValues = asyncHandler(
  async (req: Request, res: Response) => {
    const { label } = req.params;
    const values = await prometheusService.getLabelValues(label);
    return res.json({ success: true, data: values });
  }
);

/**
 * Get all metric names
 */
export const getMetrics = asyncHandler(async (req: Request, res: Response) => {
  const metrics = await prometheusService.getMetrics();
  return res.json({ success: true, data: metrics });
});

/**
 * Get series metadata
 */
export const getSeries = asyncHandler(async (req: Request, res: Response) => {
  const { match, start, end } = req.query;

  if (!match) {
    return res.status(400).json({
      success: false,
      error: "Match parameter is required",
    });
  }

  const matchArray = Array.isArray(match) ? match : [match];
  const series = await prometheusService.getSeries(
    matchArray as string[],
    start as string | undefined,
    end as string | undefined
  );

  return res.json({ success: true, data: series });
});

/**
 * Get targets
 */
export const getTargets = asyncHandler(async (req: Request, res: Response) => {
  const targets = await prometheusService.getTargets();
  return res.json({ success: true, data: targets });
});

/**
 * Get rules
 */
export const getRules = asyncHandler(async (req: Request, res: Response) => {
  const rules = await prometheusService.getRules();
  return res.json({ success: true, data: rules });
});

/**
 * Get alerts
 */
export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const alerts = await prometheusService.getAlerts();
  return res.json({ success: true, data: alerts });
});

/**
 * Check Prometheus health
 */
export const checkHealth = asyncHandler(async (req: Request, res: Response) => {
  const health = await prometheusService.checkHealth();
  return res.json({ success: true, data: health });
});
