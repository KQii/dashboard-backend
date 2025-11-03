import { AxiosInstance } from "axios";
import { CustomError } from "../middleware/errorHandler";

export const getGaugeResponse = async (
  client: AxiosInstance,
  query: string
) => {
  try {
    const response = await client.get(`/api/v1/query?query=${query}`);
    return parseInt(response.data.data.result[0].value[1]);
  } catch (error: any) {
    throw new CustomError(
      `Prometheus query failed: ${error.message}`,
      error.response?.status || 500
    );
  }
};
