function validatePlan(plan, availableTools) {

  if (!plan || typeof plan !== "object") {
    return {
      valid: false,
      error: "Plan must be an object"
    };
  }

  if (!Array.isArray(plan.tasks)) {
    return {
      valid: false,
      error: "tasks must be an array"
    };
  }

  const allowedTools = new Set(
    availableTools.map(tool => tool.name)
  );

  for (const task of plan.tasks) {

    if (!task.id) {
      return {
        valid: false,
        error: "Task id is missing"
      };
    }

    if (task.tool && !allowedTools.has(task.tool)) {
      return {
        valid: false,
        error: `Unknown tool: ${task.tool}`
      };
    }

    if (!task.parameters || typeof task.parameters !== "object") {
      return {
        valid: false,
        error: `Invalid parameters for ${task.id}`
      };
    }
  }

  return {
    valid: true
  };
}

module.exports = {
  validatePlan
};