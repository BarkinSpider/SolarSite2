import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Prometheus Proxy
  // The user specified oracle.inetd.com:9090
  const PROMETHEUS_URL = "http://oracle.inetd.com:9090";

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/metrics", async (req, res) => {
    const { match } = req.query;
    try {
      console.log(`Fetching metric names from: ${PROMETHEUS_URL} with match: ${match || '{__name__=~"eg4.*"}'}`);
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/label/__name__/values`, {
        params: { match: match || '{__name__=~"eg4.*"}' },
        timeout: 5000 // 5 second timeout
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Error fetching metric names:", error.message);
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({ error: `Connection refused to ${PROMETHEUS_URL}. Is Prometheus running?` });
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        res.status(504).json({ error: `Connection timed out to ${PROMETHEUS_URL}` });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.get("/api/query", async (req, res) => {
    const { query } = req.query;
    console.log(`Received query request: ${query}`);
    try {
      const fullUrl = `${PROMETHEUS_URL}/api/v1/query`;
      console.log(`Executing Prometheus Query: ${fullUrl}?query=${encodeURIComponent(query as string)}`);
      const response = await axios.get(fullUrl, {
        params: { query },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Error querying Prometheus:", error.message);
      const status = error.response?.status || 500;
      const data = error.response?.data || { error: error.message };
      res.status(status).json(data);
    }
  });

  app.get("/api/query_range", async (req, res) => {
    const { query, start, end, step } = req.query;
    try {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
        params: { query, start, end, step },
        timeout: 15000
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Error querying Prometheus range:", error.message);
      const status = error.response?.status || 500;
      const data = error.response?.data || { error: error.message };
      res.status(status).json(data);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
