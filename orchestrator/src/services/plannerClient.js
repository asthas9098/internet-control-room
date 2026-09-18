const axios = require("axios");

async function createPlan(goal, tools = []) {
  try {
    const plannerUrl =
      process.env.P2_PLANNER_URL || "http://localhost:5002";

    const response = await axios.post(
      `${plannerUrl}/api/agent/plan`,
      {
        goal,
        tools
      },
      {
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    console.error("P2 Planner Error:", error.message);

    throw new Error("Unable to create execution plan");
  }
}

module.exports = {
  createPlan
};