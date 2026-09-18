const express = require("express");
const cors = require("cors");
require("dotenv").config();

const agentRoutes = require("./routes/agent.js");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/agent", agentRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Internet Control Room - P4 is running!"
  });
});

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  console.log(`P4 Orchestrator running on port ${PORT}`);
});
