const { spawn } = require("child_process");

class BobShellExecutor {
  constructor(apiKey, shellPath = "bob") {
    this.apiKey = apiKey;
    this.shellPath = shellPath;
  }

  async executeCommand(prompt, githubToken, workingDir = process.cwd(), options = {}) {
    return new Promise((resolve, reject) => {
      const args = ["-p", prompt, "--yolo"];
      const requestId = options.requestId || "unknown";

      console.log(`[${requestId}] Starting Bob Shell execution with MCP`, {
        shellPath: this.shellPath,
        workingDir,
        promptLength: prompt.length,
        hasApiKey: Boolean(this.apiKey),
        hasGithubToken: Boolean(githubToken),
      });

      // Bob Shell automatically loads MCP settings from ~/.bob/mcp_settings.json
      // The Dockerfile copies mcp_settings.json to /home/nodejs/.bob/mcp_settings.json

      const bobProcess = spawn(this.shellPath, args, {
        cwd: workingDir,
        env: {
          ...process.env,
          BOBSHELL_API_KEY: this.apiKey,
          GITHUB_PERSONAL_ACCESS_TOKEN: githubToken,
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      bobProcess.stdout.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        console.log(`[${requestId}] Bob Shell stdout:`, text);
        options.onStdout?.(text);
      });
      bobProcess.stderr.on("data", (data) => {
        const text = data.toString();
        stderr += text;
        console.error(`[${requestId}] Bob Shell stderr:`, text);
        options.onStderr?.(text);
      });

      bobProcess.on("close", (code, signal) => {
        const logPayload = {
          exitCode: code,
          signal,
          stdoutLength: stdout.length,
          stderrLength: stderr.length,
          stdoutTail: tail(stdout),
          stderrTail: tail(stderr),
        };

        if (code === 0) {
          console.log(`[${requestId}] Bob Shell execution completed`, logPayload);
        } else {
          console.error(`[${requestId}] Bob Shell execution failed`, logPayload);
        }

        resolve({
          success: code === 0,
          exitCode: code,
          signal,
          stdout,
          stderr,
        });
      });

      bobProcess.on("error", (error) => {
        console.error(`[${requestId}] Failed to start Bob Shell process`, {
          shellPath: this.shellPath,
          workingDir,
          message: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          path: error.path,
          spawnargs: error.spawnargs,
        });
        reject(error);
      });
    });
  }
}

function tail(value, maxLength = 4000) {
  if (!value) {
    return "";
  }

  return value.length > maxLength ? value.slice(-maxLength) : value;
}

module.exports = BobShellExecutor;
