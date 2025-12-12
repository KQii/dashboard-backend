import fs from "fs/promises";
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

export interface Channel {
  id: string;
  type: string;
  name?: string;
  description?: string;
  sendTo: string;
  isActive: boolean;
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

interface AlertmanagerRoute {
  receiver: string;
  continue: boolean;
  match?: {
    target: string;
  };
}

export interface AlertmanagerConfig {
  global: { resolve_timeout: string };
  route: {
    group_by: string[];
    group_wait: string;
    group_interval: string;
    repeat_interval: string;
    receiver: string;
    routes: AlertmanagerRoute[];
  };
  inhibit_rules: Array<{
    source_match: { severity: string };
    target_match: { severity: string };
    equal: string[];
  }>;
  receivers: Array<any>;
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

      const activeChannels = parsed.route.routes
        .filter((c: any) => c.receiver !== "self-healing-webhook")
        ?.map((c: any) => c.receiver.replace("-receiver", ""));
      const receivers = parsed.receivers.filter(
        (c: any) => c.name !== "blackhole" && c.name !== "self-healing-webhook"
      );

      const mapSendTo = {
        email: "to",
        slack: "channel",
      };

      const result = Object.entries(mapSendTo)
        .filter(([type]) => receivers.find((r: any) => r[`${type}_configs`]))
        .map(([type, key]) => {
          const config = receivers.find((r: any) => r[`${type}_configs`])[
            `${type}_configs`
          ][0];
          const isActive = activeChannels?.includes(type) ?? false;
          return {
            id: type,
            type,
            sendTo: config[key],
            isActive,
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

  cleanEnv = (val: string) => (val ? val.replace(/^"|"$/g, "") : "");

  async updateChannels(activeChannels: string[]): Promise<void> {
    try {
      const emailAuthUsername = process.env.EMAIL_CONFIG_AUTH_USERNAME!;
      const emailAuthPassword = this.cleanEnv(
        process.env.EMAIL_CONFIG_AUTH_PASSWORD!
      );
      const slackChannel = this.cleanEnv(process.env.SLACK_CONFIG_CHANNEL!);
      const slackApiUrl = process.env.SLACK_CONFIG_API_URL!;
      const selfhealingWebhookUrl = process.env.SELFHEALING_WEBHOOK_CONFIG_URL!;

      const alertManagerConfig: AlertmanagerConfig = {
        global: { resolve_timeout: "5m" },
        route: {
          group_by: ["alertname", "name"],
          group_wait: "30s",
          group_interval: "1m",
          repeat_interval: "5m",
          receiver: "blackhole", // Mặc định về hố đen
          routes: [
            {
              match: {
                target: "self_healing",
              },
              receiver: "self-healing-webhook",
              continue: false,
            },
          ],
        },
        inhibit_rules: [
          {
            source_match: {
              severity: "critical",
            },
            target_match: {
              severity: "warning",
            },
            equal: ["cluster", "instance", "name"],
          },
        ],
        receivers: [
          {
            name: "email-receiver",
            email_configs: [
              {
                to: "trinhkhanhquan.business@gmail.com",
                from: "Elasticsearch Monitoring <quan25112002@gmail.com>",
                smarthost: "smtp.gmail.com:587",
                auth_username: emailAuthUsername,
                auth_password: emailAuthPassword,
                require_tls: true,
                send_resolved: true,
                headers: {
                  subject:
                    "Elasticsearch Alert: {{ .CommonAnnotations.summary }}",
                },
                html: "<b>Elasticsearch Alert</b>: {{ .CommonAnnotations.summary }}<br>{{ .CommonAnnotations.description }}",
              },
            ],
          },
          {
            name: "slack-receiver",
            slack_configs: [
              {
                api_url: slackApiUrl,
                channel: slackChannel,
                send_resolved: true,
                title: "{{ .CommonAnnotations.summary }}",
                text: "{{ .CommonAnnotations.description }}",
                username: "Elasticsearch Monitor",
                icon_emoji: ":warning:",
              },
            ],
          },
          {
            name: "self-healing-webhook",
            webhook_configs: [
              {
                url: selfhealingWebhookUrl,
                send_resolved: true,
              },
            ],
          },
          {
            name: "blackhole",
          },
        ],
      };

      if (activeChannels.includes("email")) {
        alertManagerConfig.route.routes.push({
          receiver: "email-receiver",
          continue: true,
        });
      }

      if (activeChannels.includes("slack")) {
        alertManagerConfig.route.routes.push({
          receiver: "slack-receiver",
          continue: true,
        });
      }

      await this.updateAlertConfig(alertManagerConfig);
    } catch (error: any) {
      throw new CustomError(
        `Failed to select channel: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Update Alertmanager configuration file and reload
   */
  private async updateAlertConfig(
    configObject: AlertmanagerConfig
  ): Promise<{ success: boolean }> {
    try {
      const configPath =
        process.env.ALERTMANAGER_CONFIG_PATH || "/app/configs/alertmanager.yml";
      const yamlStr = yaml.dump(configObject);

      await fs.writeFile(configPath, yamlStr, "utf8");
      await this.client.post("/-/reload");
      return { success: true };
    } catch (error: any) {
      throw new CustomError(
        `Failed to update config: ${error.message}`,
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
        `Failed to reload config: ${error.message}`,
        error.response?.status || 500
      );
    }
  }
}

export default new AlertmanagerService();
