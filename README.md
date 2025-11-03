# Dashboard Backend

A TypeScript-based Express.js backend that serves as a middleware between the frontend and monitoring services like Prometheus and Alertmanager.

## Features

- 🚀 Express.js with TypeScript
- 📊 Prometheus integration
- 🚨 Alertmanager integration
- 🔒 Security with Helmet and CORS
- 🎯 Error handling middleware
- 📝 Request logging with Morgan
- 🔥 Hot reload with Nodemon

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Prometheus instance (optional for testing)
- Alertmanager instance (optional for testing)

## Installation

1. Clone the repository and navigate to the project directory:

```bash
cd dashboard-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
copy .env.example .env
```

4. Update the `.env` file with your configuration:

```env
PORT=3001
NODE_ENV=development
PROMETHEUS_URL=http://localhost:9090
ALERTMANAGER_URL=http://localhost:9093
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## API Endpoints

### Health Check

- `GET /health` - Check server health

### Prometheus Endpoints

- `GET /api/prometheus/query` - Execute instant query
  - Query params: `query`, `time` (optional)
- `GET /api/prometheus/query_range` - Execute range query
  - Query params: `query`, `start`, `end`, `step`
- `GET /api/prometheus/labels` - Get all labels
- `GET /api/prometheus/label/:label/values` - Get values for a specific label
- `GET /api/prometheus/metrics` - Get all metric names
- `GET /api/prometheus/series` - Get series metadata
  - Query params: `match[]`, `start` (optional), `end` (optional)
- `GET /api/prometheus/targets` - Get scrape targets
- `GET /api/prometheus/rules` - Get recording and alerting rules
- `GET /api/prometheus/alerts` - Get active alerts
- `GET /api/prometheus/health` - Check Prometheus health

### Alertmanager Endpoints

- `GET /api/alertmanager/alerts` - Get all alerts
  - Query params: `filter` (optional)
- `GET /api/alertmanager/alerts/groups` - Get alert groups
  - Query params: `filter` (optional)
- `POST /api/alertmanager/alerts` - Post new alerts
- `GET /api/alertmanager/silences` - Get all silences
  - Query params: `filter` (optional)
- `GET /api/alertmanager/silence/:id` - Get specific silence
- `POST /api/alertmanager/silences` - Create new silence
- `DELETE /api/alertmanager/silence/:id` - Delete silence
- `GET /api/alertmanager/receivers` - Get all receivers
- `GET /api/alertmanager/status` - Get Alertmanager status
- `GET /api/alertmanager/health` - Check Alertmanager health

## Project Structure

```
dashboard-backend/
├── src/
│   ├── controllers/        # Request handlers
│   │   ├── prometheus.controller.ts
│   │   └── alertmanager.controller.ts
│   ├── services/          # Business logic
│   │   ├── prometheus.service.ts
│   │   └── alertmanager.service.ts
│   ├── routes/            # Route definitions
│   │   ├── prometheus.routes.ts
│   │   └── alertmanager.routes.ts
│   ├── middleware/        # Custom middleware
│   │   ├── errorHandler.ts
│   │   └── asyncHandler.ts
│   └── index.ts          # Application entry point
├── dist/                 # Compiled JavaScript (generated)
├── .env                  # Environment variables
├── .env.example         # Example environment variables
├── .gitignore
├── package.json
├── tsconfig.json
├── nodemon.json
├── .eslintrc.json
└── README.md
```

## Example Requests

### Query Prometheus

```bash
# Instant query
curl "http://localhost:3001/api/prometheus/query?query=up"

# Range query
curl "http://localhost:3001/api/prometheus/query_range?query=rate(http_requests_total[5m])&start=2024-01-01T00:00:00Z&end=2024-01-01T01:00:00Z&step=60s"
```

### Get Alertmanager Alerts

```bash
curl "http://localhost:3001/api/alertmanager/alerts"
```

### Create Silence

```bash
curl -X POST http://localhost:3001/api/alertmanager/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [
      {
        "name": "alertname",
        "value": "TestAlert",
        "isRegex": false,
        "isEqual": true
      }
    ],
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-01-01T23:59:59Z",
    "createdBy": "admin",
    "comment": "Maintenance window"
  }'
```

## Environment Variables

| Variable           | Description                            | Default                 |
| ------------------ | -------------------------------------- | ----------------------- |
| `PORT`             | Server port                            | `3001`                  |
| `NODE_ENV`         | Environment (development/production)   | `development`           |
| `PROMETHEUS_URL`   | Prometheus server URL                  | `http://localhost:9090` |
| `ALERTMANAGER_URL` | Alertmanager server URL                | `http://localhost:9093` |
| `ALLOWED_ORIGINS`  | CORS allowed origins (comma-separated) | `*`                     |

## License

ISC
