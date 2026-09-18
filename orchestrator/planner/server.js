const express = require("express");
const cors = require("cors");
require("dotenv").config();

const agentRoutes = require("./routes/agent");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "P2 AI Planner is running"
  });
});

app.use("/api/agent", agentRoutes);

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`P2 Planner running on port ${PORT}`);
});