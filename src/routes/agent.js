const express = require("express");

const router = express.Router();

const orchestrator = require("../services/orchestrator");

router.get("/", (req, res) => {
  res.json({
    message: "Agent route is working!"
  });
});

router.post("/run", async (req, res) => {
  try {
    const { goal } = req.body;

    if (!goal) {
      return res.status(400).json({
        success: false,
        error: "Goal is required"
      });
    }

    const run = await orchestrator.startRun(goal);

    res.status(201).json({
      success: true,
      run
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Failed to start agent"
    });
  }
});

router.get("/run/:runId", (req, res) => {
  const run = orchestrator.getRun(req.params.runId);

  if (!run) {
    return res.status(404).json({
      success: false,
      error: "Run not found"
    });
  }

  res.json({
    success: true,
    run
  });
});

module.exports = router;