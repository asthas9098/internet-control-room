const client = require("./openai");
const { validatePlan } = require("../validators/planValidator");

async function createPlan(goal, availableTools) {

  const toolsText = JSON.stringify(availableTools, null, 2);

  const prompt = `
You are the AI Planner for an agent orchestration system.

Your job is to convert a user's high-level goal into small executable tasks.

IMPORTANT RULES:

1. Use ONLY tools provided in the available tools list.
2. NEVER invent a tool.
3. Do NOT execute tools.
4. Do NOT fabricate tool results.
5. Break the goal into logical executable tasks.
6. Identify dependencies between tasks.
7. Generate parameters for each task.
8. Mark actions requiring human approval with requiresApproval=true.
9. If the goal cannot be completed with the available tools, return an empty tasks array.
10. Return ONLY valid JSON.
11. Do not use markdown.
12. Do not add explanations outside JSON.

USER GOAL:
${goal}

AVAILABLE TOOLS:
${toolsText}

Return exactly this structure:

{
  "goal": "original goal",
  "tasks": [
    {
      "id": "task_1",
      "name": "short task name",
      "description": "what the task does",
      "tool": "tool name from available tools",
      "parameters": {},
      "dependsOn": [],
      "requiresApproval": false
    }
  ]
}
`;

  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    input: prompt
  });

  const text = response.output_text;

  let plan;

  try {
    plan = JSON.parse(text);
  } catch (error) {
    throw new Error("AI returned invalid JSON");
  }

  const validation = validatePlan(plan, availableTools);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return plan;
}

module.exports = {
  createPlan
};