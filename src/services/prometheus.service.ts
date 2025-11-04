import axios, { AxiosInstance } from "axios";
import { v4 as uuidv4 } from "uuid";
import { CustomError } from "../middleware/errorHandler";
import { getGaugeResponse } from "../utils/callApiFormatGaugeResponse";

export interface PrometheusQueryResult {
  status: string;
  data: {
    resultType: string;
    result: any[];
  };
}

export interface ClusterMetrics {
  health: string;
  nodeCount: number;
  dataNodeCount: number;
  primaryShards: number;
  unassignedShards: number;
  documentCount: number;
  timestamp: string;
}

export interface PrometheusMetric {
  metric: Record<string, string>;
  value?: [number, string];
  values?: [number, string][];
}

export interface CPUMetric {
  timestamp: string;
  usage: number;
}

export interface JVMMetric {
  timestamp: string;
  heapUsed: number;
  heapMax: number;
  heapPercent: number;
}

class PrometheusService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.PROMETHEUS_URL || "http://localhost:9090/prometheus";
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async getClusterMetrics(): Promise<ClusterMetrics> {
    try {
      const healthResponse = await this.client.get(
        "/api/v1/query?query=elasticsearch_cluster_health_status"
      );
      const health =
        healthResponse.data.data.result.find(
          (item: any) => item.value[1] === "1"
        )?.metric.color || "";

      const nodeCount = await getGaugeResponse(
        this.client,
        "elasticsearch_cluster_health_number_of_nodes"
      );

      const dataNodeCount = await getGaugeResponse(
        this.client,
        "elasticsearch_cluster_health_number_of_data_nodes"
      );

      const primaryShards = await getGaugeResponse(
        this.client,
        "elasticsearch_cluster_health_active_primary_shards"
      );

      const unassignedShards = await getGaugeResponse(
        this.client,
        "elasticsearch_cluster_health_unassigned_shards"
      );

      const numberOfDocumentsResponse = await this.client.get(
        "/api/v1/query?query=elasticsearch_indices_docs_total"
      );
      const documentCount = numberOfDocumentsResponse.data.data.result.reduce(
        (acc: number, item: any) => {
          return acc + parseInt(item.value[1]);
        },
        0
      );

      return {
        health,
        nodeCount,
        dataNodeCount,
        primaryShards,
        unassignedShards,
        documentCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new CustomError(
        `Failed to get Cluster metrics: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  async getCPUMetrics(
    start: string,
    end: string,
    step: string
  ): Promise<CPUMetric[]> {
    try {
      const params = {
        query: "elasticsearch_process_cpu_percent",
        start: decodeURIComponent(start),
        end: decodeURIComponent(end),
        step,
      };
      const response = await this.client.get("/api/v1/query_range", { params });
      const cpuMetrics: CPUMetric[] = response.data.data.result?.flatMap(
        (node: any) =>
          node.values.map(([timestamp, usage]: any) => ({
            timestamp: new Date(timestamp * 1000).toISOString(),
            nodeName: node.metric.name,
            usage: parseFloat(usage),
          }))
      );
      return cpuMetrics;
    } catch (error: any) {
      throw new CustomError(
        `Failed to get CPU metrics: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  async getJVMMetrics(
    start: string,
    end: string,
    step: string
  ): Promise<JVMMetric[]> {
    try {
      const params = {
        start: decodeURIComponent(start),
        end: decodeURIComponent(end),
        step,
      };
      const heapUsedResponse = await this.client.get("/api/v1/query_range", {
        params: {
          query: `elasticsearch_jvm_memory_used_bytes{area="heap"}`,
          ...params,
        },
      });
      const heapMaxResponse = await this.client.get("/api/v1/query_range", {
        params: {
          query: "elasticsearch_jvm_memory_max_bytes",
          ...params,
        },
      });
      const heapUsedMetrics = heapUsedResponse.data.data.result?.flatMap(
        (node: any) =>
          node.values.map(([timestamp, memory]: any) => ({
            timestamp: new Date(timestamp * 1000).toISOString(),
            nodeName: node.metric.name,
            heapUsed: (parseFloat(memory) / 1024).toFixed(2),
          }))
      );

      const heapMaxMetrics = heapMaxResponse.data.data.result?.flatMap(
        (node: any) =>
          node.values.map(([timestamp, memory]: any) => ({
            timestamp: new Date(timestamp * 1000).toISOString(),
            nodeName: node.metric.name,
            heapMax: (parseFloat(memory) / 1024).toFixed(2),
          }))
      );

      const metric = heapUsedMetrics.map((item: any) => ({
        timestamp: item.timestamp,
        nodeName: item.nodeName,
        heapUsed: item.heapUsed,
        heapMax: heapMaxMetrics.find(
          (m: any) =>
            m.timestamp === item.timestamp && m.nodeName === item.nodeName
        ).heapMax,
        heapPercent: parseFloat(
          (
            (item.heapUsed /
              heapMaxMetrics.find(
                (m: any) =>
                  m.timestamp === item.timestamp && m.nodeName === item.nodeName
              ).heapMax) *
            100
          ).toFixed(2)
        ),
      }));

      return metric;
    } catch (error: any) {
      throw new CustomError(
        `Failed to get CPU metrics: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  async getRulesProcessed(): Promise<any> {
    try {
      const response = await this.client.get("/api/v1/rules");
      const rules = response.data.data.groups.flatMap((g: any) =>
        g.rules.map((r: any) => ({
          id: r.name,
          name: r.name,
          groupName: g.name,
          state: r.state,
          query: r.query,
          duration: r.duration,
          severity: r.labels.severity,
          annotations: r.annotations,
          alerts: r.alerts.map((alert: any) => ({
            id: uuidv4(),
            ...alert,
          })),
          lastEvaluation: r.lastEvaluation,
        }))
      );

      return rules;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch rules: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  async getRuleGroups(): Promise<any> {
    try {
      const response = await this.client.get("/api/v1/rules");
      const groups = Array.from(
        new Set(response.data.data.groups.map((g: any) => g.name))
      );

      return groups;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch rules: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  // Raw service
  /**
   * Execute an instant query
   */
  async query(query: string, time?: string): Promise<PrometheusQueryResult> {
    try {
      const params: any = { query };
      if (time) params.time = time;

      const response = await this.client.get("/api/v1/query", { params });
      return response.data;
    } catch (error: any) {
      throw new CustomError(
        `Prometheus query failed: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Execute a range query
   */
  async queryRange(
    query: string,
    start: string,
    end: string,
    step: string
  ): Promise<PrometheusQueryResult> {
    try {
      const params = { query, start, end, step };
      const response = await this.client.get("/api/v1/query_range", { params });
      return response.data;
    } catch (error: any) {
      throw new CustomError(
        `Prometheus range query failed: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get all labels
   */
  async getLabels(): Promise<string[]> {
    try {
      const response = await this.client.get("/api/v1/labels");
      return response.data.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch labels: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get label values for a specific label
   */
  async getLabelValues(label: string): Promise<string[]> {
    try {
      const response = await this.client.get(`/api/v1/label/${label}/values`);
      return response.data.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch label values: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get all metric names
   */
  async getMetrics(): Promise<string[]> {
    try {
      const response = await this.client.get("/api/v1/label/__name__/values");
      return response.data.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch metrics: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get series metadata
   */
  async getSeries(
    match: string[],
    start?: string,
    end?: string
  ): Promise<any[]> {
    try {
      const params: any = { "match[]": match };
      if (start) params.start = start;
      if (end) params.end = end;

      const response = await this.client.get("/api/v1/series", { params });
      return response.data.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch series: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get targets
   */
  async getTargets(): Promise<any> {
    try {
      const response = await this.client.get("/api/v1/targets");
      return response.data.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch targets: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get rules
   */
  async getRules(): Promise<any> {
    try {
      const response = await this.client.get("/api/v1/rules");
      return response.data.data;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch rules: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get alerts
   */
  async getAlerts(): Promise<any[]> {
    try {
      const response = await this.client.get("/api/v1/alerts");
      return response.data.data.alerts;
    } catch (error: any) {
      throw new CustomError(
        `Failed to fetch alerts: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Check Prometheus health
   */
  async checkHealth(): Promise<{ status: string }> {
    try {
      const response = await this.client.get("/-/healthy");
      return { status: response.status === 200 ? "healthy" : "unhealthy" };
    } catch (error: any) {
      throw new CustomError(
        `Prometheus health check failed: ${error.message}`,
        error.response?.status || 500
      );
    }
  }
}

export default new PrometheusService();
