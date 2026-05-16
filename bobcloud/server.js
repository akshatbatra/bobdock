const express = require('express');
const BobShellExecutor = require('./BobShellExecutor');
const app = express();
app.use(express.json());

const apiKey = process.env.BOB_API_KEY || process.env.BOBSHELL_API_KEY;
if (!apiKey) {
  console.error('WARNING: No BOB_API_KEY or BOBSHELL_API_KEY environment variable set');
} else {
  console.log('API key detected (length:', apiKey.length, ')');
}
const bobExecutor = new BobShellExecutor(apiKey);
const jobs = new Map();
const jobTtlMs = 60 * 60 * 1000;

app.post("/api/execute", (req, res) => {
  const { prompt, githubToken } = req.body;
  const requestId = createRequestId();
  const jobId = requestId;

  if (!prompt) {
    console.warn(`[${requestId}] Execute request rejected: missing prompt`);
    return res.status(400).json({ success: false, error: "Prompt is required" });
  }

  console.log(`[${requestId}] Execute request received`, {
    promptLength: prompt.length,
  });

  const job = {
    id: jobId,
    requestId,
    status: "queued",
    success: false,
    output: "",
    error: "",
    exitCode: undefined,
    signal: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: undefined,
  };

  jobs.set(jobId, job);
  runJob(job, prompt, githubToken);

  res.status(202).json({
    success: true,
    jobId,
    requestId,
    status: job.status,
  });
});

app.get("/api/execute/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: "Execution job was not found. It may have expired or the machine may have restarted.",
    });
  }

  res.json(toJobResponse(job));
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

setInterval(cleanupJobs, 5 * 60 * 1000).unref();

async function runJob(job, prompt, githubToken) {
  job.status = "running";
  job.updatedAt = new Date().toISOString();

  try {
    const result = await bobExecutor.executeCommand(prompt, githubToken, process.cwd(), {
      requestId: job.requestId,
      onStdout: (text) => {
        job.output += text;
        job.updatedAt = new Date().toISOString();
      },
      onStderr: (text) => {
        job.error += text;
        job.updatedAt = new Date().toISOString();
      },
    });

    job.success = result.success;
    job.status = result.success ? "completed" : "failed";
    job.output = result.stdout;
    job.error = result.stderr;
    job.exitCode = result.exitCode;
    job.signal = result.signal;
    job.completedAt = new Date().toISOString();
    job.updatedAt = job.completedAt;

    if (!result.success) {
      console.error(`[${job.requestId}] Bob Shell job failed`, {
        exitCode: result.exitCode,
        signal: result.signal,
        stderrTail: tail(result.stderr),
        stdoutTail: tail(result.stdout),
      });
    }
  } catch (err) {
    job.success = false;
    job.status = "failed";
    job.error = err.message;
    job.completedAt = new Date().toISOString();
    job.updatedAt = job.completedAt;

    console.error(`[${job.requestId}] Bob Shell job crashed`, {
      message: err.message,
      stack: err.stack,
    });
  }
}

function toJobResponse(job) {
  return {
    success: job.success,
    jobId: job.id,
    requestId: job.requestId,
    status: job.status,
    output: job.output,
    error: job.error,
    exitCode: job.exitCode,
    signal: job.signal,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    outputTail: tail(job.output),
    errorTail: tail(job.error),
  };
}

function cleanupJobs() {
  const cutoff = Date.now() - jobTtlMs;

  for (const [jobId, job] of jobs.entries()) {
    if (Date.parse(job.updatedAt) < cutoff) {
      jobs.delete(jobId);
    }
  }
}

function createRequestId() {
  return `bob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function tail(value, maxLength = 4000) {
  if (!value) {
    return "";
  }

  return value.length > maxLength ? value.slice(-maxLength) : value;
}
