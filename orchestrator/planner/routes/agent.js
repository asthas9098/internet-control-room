const express = require("express");
const router = express.Router();

const { createPlan } = require("../services/planner");

router.post("/plan", async (req, res) => {
  try {
    const { goal, tools } = req.body;

    if (!goal) {
      return res.status(400).json({
        error: "goal is required"
      });
    }

    const availableTools = tools || [];

    const plan = await createPlan(goal, availableTools);

    res.json(plan);

  } catch (error) {
    console.error("Planner error:", error);

    res.status(500).json({
      error: "Failed to create plan",
      message: error.message
    });
  }
});

module.exports = router;