import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import prometheusRoutes from "./routes/prometheus.routes";
import alertmanagerRoutes from "./routes/alertmanager.routes";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use("/api/prometheus", prometheusRoutes);
app.use("/api/alertmanager", alertmanagerRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Prometheus URL: ${process.env.PROMETHEUS_URL}`);
  console.log(`🚨 Alertmanager URL: ${process.env.ALERTMANAGER_URL}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

export default app;
