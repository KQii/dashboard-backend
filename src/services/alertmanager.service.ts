import axios, { AxiosInstance } from "axios";
import yaml from "js-yaml";
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
  async getAlerts(): Promise<any[]> {
    try {
      const response = await this.client.get("/api/v2/alerts");
      const alerts = response.data.map((a: any) => ({
        id: a.fingerprint,
        name: a.labels.alertname,
        severity: a.labels.severity,
        state: a.status.state,
        status: a.status,
        annotations: a.annotations,
        labels: a.labels,
        receivers: a.receivers,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        updatedAt: a.updatedAt,
      }));

      return alerts;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch alerts: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  async getAlertLabels(): Promise<any[]> {
    try {
      const response = await this.client.get("/api/v2/alerts");
      const labels = response.data.map((a: any) => ({
        labels: a.labels,
      }));

      const mergedLabels = labels.reduce((acc: any, label: any) => {
        Object.entries(label.labels).forEach(([key, value]) => {
          // Nếu key chưa có, khởi tạo mảng
          if (!acc[key]) {
            acc[key] = [value];
          }
          // Nếu key có rồi nhưng chưa có giá trị này thì thêm vào
          else if (!acc[key].includes(value)) {
            acc[key].push(value);
          }
        });
        return acc;
      }, {});

      return mergedLabels;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch alerts: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  async getChannels(): Promise<any[]> {
    try {
      const response = await this.client.get("/api/v2/status");
      const parsed: any = yaml.load(response.data?.config.original);
      // const channel = Object.keys(parsed.receivers[0])
      //   .slice(1)
      //   .map((c) => c.replace(/_config(s)?$/, ""));
      const receiver = parsed.receivers[0];

      const mapSendTo = {
        email: "to",
        slack: "channel",
      };

      const result = Object.entries(mapSendTo)
        .filter(([type]) => receiver[`${type}_configs`])
        .map(([type, key]) => {
          const config = receiver[`${type}_configs`][0];
          return {
            id: type,
            type,
            sendTo: config[key],
          };
        });

      return result;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch status: ${error.message}`,
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
  async getSilences(): Promise<any[]> {
    try {
      const response = await this.client.get("/api/v2/silences");

      const silences = response.data.map((s: any) => ({
        ...s,
        state: s.status.state,
      }));

      return silences;
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

  async reloadConfig(): Promise<any> {
    try {
      const response = await this.client.post("/-/reload");
      return response.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to create silence: ${error.message}`,
        error.response?.status || 500
      );
    }
  }
}

export default new AlertmanagerService();
