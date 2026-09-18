const { createPlan } = require("./plannerClient");
const { executeTool } = require("./toolClient");
const { verifyResult } = require("./verifier");
const { recover } = require("./recovery");

class Orchestrator {
  constructor() {
    this.runs = new Map();
  }

  async startRun(goal) {
    const runId = Date.now().toString();

    const run = {
      runId,
      goal,
      status: "planning",
      tasks: [],
      currentTask: null,
      logs: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null
    };

    this.runs.set(runId, run);

    this.addLog(runId, "Goal received");

    // Start execution in background
    this.executeRun(runId).catch((error) => {
      console.error("Agent execution error:", error);

      const currentRun = this.runs.get(runId);

      if (currentRun) {
        currentRun.status = "failed";
        currentRun.error = error.message;
        currentRun.completedAt = new Date().toISOString();

        this.addLog(runId, `Agent failed: ${error.message}`);
      }
    });

    return run;
  }

  async executeRun(runId) {
    const run = this.runs.get(runId);

    if (!run) {
      throw new Error("Run not found");
    }

    try {
      // --------------------------------
      // STEP 1: Get available tools
      // --------------------------------

      run.status = "planning";
      this.addLog(runId, "Fetching available tools from P3");

      const tools = await this.getAvailableTools();

      this.addLog(
        runId,
        `Found ${tools.length} available tools`
      );

      // --------------------------------
      // STEP 2: Ask P2 for plan
      // --------------------------------

      this.addLog(runId, "Sending goal to P2 Planner");

      const plan = await createPlan(run.goal, tools);

      if (!plan || !Array.isArray(plan.tasks)) {
        throw new Error("Invalid plan received from P2");
      }

      run.tasks = plan.tasks.map((task) => ({
        ...task,
        status: "pending",
        retryCount: 0,
        result: null,
        verification: null,
        error: null
      }));

      this.addLog(
        runId,
        `Plan created with ${run.tasks.length} tasks`
      );

      // --------------------------------
      // STEP 3: Execute tasks
      // --------------------------------

      run.status = "running";

      for (const task of run.tasks) {
        run.currentTask = task.id;

        // Check dependencies
        const dependenciesCompleted =
          this.checkDependencies(task, run.tasks);

        if (!dependenciesCompleted) {
          task.status = "blocked";
          task.error = "Task dependencies are not completed";

          this.addLog(
            runId,
            `Task blocked: ${task.name}`
          );

          continue;
        }

        // Human approval placeholder
        if (task.requiresApproval === true) {
          task.status = "waiting_approval";

          this.addLog(
            runId,
            `Human approval required for: ${task.name}`
          );

          // For now, pause the run.
          run.status = "waiting_approval";

          return;
        }

        await this.executeTask(runId, task);
      }

      // --------------------------------
      // STEP 4: Finish
      // --------------------------------

      const failedTasks = run.tasks.filter(
        (task) => task.status === "failed"
      );

      const blockedTasks = run.tasks.filter(
        (task) => task.status === "blocked"
      );

      if (failedTasks.length > 0 || blockedTasks.length > 0) {
        run.status = "failed";

        this.addLog(
          runId,
          "Agent finished with failed or blocked tasks"
        );
      } else {
        run.status = "completed";

        this.addLog(
          runId,
          "All tasks completed successfully"
        );
      }

      run.currentTask = null;
      run.completedAt = new Date().toISOString();

    } catch (error) {
      run.status = "failed";
      run.error = error.message;
      run.completedAt = new Date().toISOString();

      this.addLog(
        runId,
        `Execution error: ${error.message}`
      );

      throw error;
    }
  }

  async executeTask(runId, task) {
    const run = this.runs.get(runId);

    if (!run) {
      throw new Error("Run not found");
    }

    task.status = "running";

    this.addLog(
      runId,
      `Starting task: ${task.name}`
    );

    const MAX_RETRIES = 3;

    while (task.retryCount < MAX_RETRIES) {
      try {
        // ------------------------------
        // Execute tool
        // ------------------------------

        this.addLog(
          runId,
          `Calling tool: ${task.tool}`
        );

        const result = await executeTool(
          task.tool,
          task.parameters || {}
        );

        task.result = result;

        // ------------------------------
        // Verify result
        // ------------------------------

        this.addLog(
          runId,
          `Verifying result for: ${task.name}`
        );

        const verification = verifyResult(result);

        task.verification = verification;

        if (verification.verified) {
          task.status = "completed";

          this.addLog(
            runId,
            `Task completed: ${task.name}`
          );

          return;
        }

        // ------------------------------
        // Recovery
        // ------------------------------

        this.addLog(
          runId,
          `Verification failed: ${verification.reason}`
        );

        const recovery = await recover(
          task,
          new Error(verification.reason),
          task.retryCount
        );

        if (recovery.action === "retry") {
          task.retryCount = recovery.retryCount;

          this.addLog(
            runId,
            recovery.message
          );

          continue;
        }

        task.status = "failed";
        task.error = recovery.error;

        this.addLog(
          runId,
          `Task failed: ${task.name}`
        );

        return;

      } catch (error) {
        task.retryCount++;

        this.addLog(
          runId,
          `Task error: ${error.message}`
        );

        if (task.retryCount >= MAX_RETRIES) {
          task.status = "failed";
          task.error = error.message;

          this.addLog(
            runId,
            `Maximum retries reached for: ${task.name}`
          );

          return;
        }

        this.addLog(
          runId,
          `Retrying task (${task.retryCount}/${MAX_RETRIES})`
        );
      }
    }
  }

  checkDependencies(task, allTasks) {
    if (
      !task.dependsOn ||
      task.dependsOn.length === 0
    ) {
      return true;
    }

    return task.dependsOn.every((dependencyId) => {
      const dependency = allTasks.find(
        (t) => t.id === dependencyId
      );

      return dependency?.status === "completed";
    });
  }

  async getAvailableTools() {
    const axios = require("axios");

    const toolUrl =
      process.env.P3_TOOL_URL ||
      "http://localhost:5003";

    try {
      const response = await axios.get(
        `${toolUrl}/api/tools`,
        {
          timeout: 5000
        }
      );

      return response.data.tools || response.data || [];

    } catch (error) {
      console.error(
        "Unable to fetch tools:",
        error.message
      );

      // Temporary fallback for development
      return [
        {
          name: "weather",
          description: "Gets weather information",
          parameters: ["city"]
        },
        {
          name: "calculator",
          description: "Performs calculations",
          parameters: ["expression"]
        }
      ];
    }
  }

  getRun(runId) {
    return this.runs.get(runId);
  }

  addLog(runId, message) {
    const run = this.runs.get(runId);

    if (!run) {
      return;
    }

    run.logs.push({
      timestamp: new Date().toISOString(),
      message
    });
  }
}

module.exports = new Orchestrator();