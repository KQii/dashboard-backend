import axios, { AxiosInstance } from "axios";
import { CustomError } from "../middleware/errorHandler";

export interface Alert {
  labels: Record<string, string>;
  annotations?: Record<string, string>;
  startsAt?: string;
  endsAt?: string;
  generatorURL?: string;
}

export interface Silence {
  id?: string;
  matchers: Matcher[];
  startsAt: string;
  endsAt: string;
  createdBy: string;
  comment: string;
}

export interface Matcher {
  name: string;
  value: string;
  isRegex?: boolean;
  isEqual?: boolean;
}

class AlertmanagerService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.ALERTMANAGER_URL || "http://localhost:9093";
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get all alerts
   */
  async getAlerts(filter?: string): Promise<any[]> {
    try {
      const params = filter ? { filter } : {};
      const response = await this.client.get("/api/v2/alerts", { params });
      const alerts = response.data.map((a: any) => ({
        id: a.fingerprint,
        name: a.labels.alertname,
        severity: a.labels.severity,
        status: a.status,
        description: a.annotations.description,
        labels: {
          cluster: a.labels.cluster,
          alertname: a.labels.alertname,
          instance: a.labels.instance,
        },
        startsAt: a.startsAt,
      }));

      return alerts;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch alerts: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get alert groups
   */
  async getAlertGroups(filter?: string): Promise<any[]> {
    try {
      const params = filter ? { filter } : {};
      const response = await this.client.get("/api/v2/alerts/groups", {
        params,
      });
      return response.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch alert groups: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Post alerts to Alertmanager
   */
  async postAlerts(alerts: Alert[]): Promise<void> {
    try {
      await this.client.post("/api/v2/alerts", alerts);
    } catch (error: any) {
      throw new CustomError(
        `Failed to post alerts: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get all silences
   */
  async getSilences(filter?: string): Promise<any[]> {
    try {
      const params = filter ? { filter } : {};
      const response = await this.client.get("/api/v2/silences", { params });
      return response.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch silences: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get a specific silence by ID
   */
  async getSilence(id: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/v2/silence/${id}`);
      return response.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch silence: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Create a new silence
   */
  async createSilence(silence: Silence): Promise<{ silenceID: string }> {
    try {
      const response = await this.client.post("/api/v2/silences", silence);
      return response.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to create silence: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Delete a silence
   */
  async deleteSilence(id: string): Promise<void> {
    try {
      await this.client.delete(`/api/v2/silence/${id}`);
    } catch (error: any) {
      throw new CustomError(
        `Failed to delete silence: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get receivers
   */
  async getReceivers(): Promise<any[]> {
    try {
      const response = await this.client.get("/api/v2/receivers");
      return response.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch receivers: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get Alertmanager status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await this.client.get("/api/v2/status");
      return response.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch status: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Check Alertmanager health
   */
  async checkHealth(): Promise<{ status: string }> {
    try {
      const response = await this.client.get("/-/healthy");
      return { status: response.status === 200 ? "healthy" : "unhealthy" };
    } catch (error: any) {
      throw new CustomError(
        `Alertmanager health check failed: ${error.message}`,
        error.response?.status || 500
      );
    }
  }
}

export default new AlertmanagerService();
