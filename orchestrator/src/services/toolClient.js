const axios = require("axios");

async function executeTool(toolName, parameters = {}) {
  try {
    const toolUrl =
      process.env.P3_TOOL_URL || "http://localhost:5003";

    const startTime = Date.now();

    const response = await axios.post(
      `${toolUrl}/api/tools/execute`,
      {
        tool: toolName,
        parameters
      },
      {
        timeout: 10000
      }
    );

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      tool: toolName,
      statusCode: response.status,
      data: response.data,
      executionTime,
      error: null
    };

  } catch (error) {
    return {
      success: false,
      tool: toolName,
      statusCode: error.response?.status || null,
      data: null,
      executionTime: null,
      error: error.message
    };
  }
}

module.exports = {
  executeTool
};