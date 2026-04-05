import { getInput, summary, info, setFailed } from "@actions/core";
import { getOctokit, context } from "@actions/github";

function createUrl(job, step) {
  if (step) {
    return `<a href="${job.html_url}#step:${step.number}:1">View</a>`;
  }

  if (job) {
    return `<a href="${job.html_url}">View</a>`;
  }

  return "-";
}

function getStatusEmoji(conclusion) {
  switch (conclusion) {
    case "success":
      return "✅ Passed";
    case "failure":
      return "❌ Failed";
    case "cancelled":
      return "🚫 Cancelled";
    case "skipped":
      return "⏭️ Skipped";
    case "neutral":
      return "😐 Neutral";
    case "stale":
      return "⏳ Stale";
    case "timed_out":
      return "⏰ Timed Out";
    default:
      return "❓ Unknown";
  }
}

async function run() {
  try {
    const checksInput = getInput("checks") || "eslint, tsc";
    const checksToSummarize = checksInput.split(",").map((s) => s.trim());
    const token = getInput("github_token");

    const octokit = getOctokit(token);
    const pull_request = context.payload.pull_request;
    const { owner, repo } = context.repo;
    const issue_number = context.issue.number;
    const tag = "<!-- build-for-ex-reviewer-summary -->";

    info(`Fetching checks for ref: ${pull_request?.head.sha ?? context.sha}`);

    const {
      data: { check_runs: jobs },
    } = await octokit.rest.checks.listForRef({
      owner,
      repo,
      ref: pull_request?.head.sha ?? context.sha,
    });

    // Resolve current job by looking for the one that is 'in_progress' or matches the context job name
    const currentJob = jobs.find(
      (j) => j.name === context.job || j.status === "in_progress",
    );

    if (currentJob) {
      info(`Current job identified: ${currentJob.name}`);
    } else {
      info(
        `Jobs found: ${jobs.length} - ${jobs.map((j) => j.name).join(", ")}`,
      );
    }

    const tasks = checksToSummarize.map((id) => {
      // Check for matching Job (like 'eslint' or 'tsc')
      const targetJob = jobs.find(
        (j) => j.name.toLowerCase() === id.toLowerCase(),
      );
      if (targetJob) {
        return {
          name: targetJob.name,
          status: targetJob.conclusion,
          url: createUrl(targetJob),
        };
      }

      return { name: id, status: null, url: createUrl(null, null) };
    });

    const tableRows = tasks.map((task) => {
      return [task.name, getStatusEmoji(task.status), task.url];
    });

    const isFailed = tasks.some((task) => task.status !== "success");

    if (issue_number) {
      // Build the report content using core.summary
      summary
        .addHeading(
          isFailed
            ? "❌ Code Quality Review Failure"
            : "✅ Code Quality Review Success",
        )
        .addRaw(
          isFailed
            ? "Some checks did not pass in the latest run. Below is the summary of results:"
            : "All checks passed successfully in the latest run. Below is the summary of results:",
        )
        .addBreak()
        .addTable([["Check", "Status", "Details"], ...tableRows])
        .addRaw(`\n${tag}`);

      // We use stringify() to get the markdown but we DO NOT call write()
      const commentBody = summary.stringify();

      // Locate existing bot comment and update if possible
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number,
      });

      const existingComment = comments.find((comment) =>
        comment.body.includes(tag),
      );

      if (existingComment) {
        await octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body: commentBody,
        });
        info(
          `Successfully updated the code quality report on PR #${issue_number}.`,
        );
      } else {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number,
          body: commentBody,
        });
        info(`First report posted to PR #${issue_number}.`);
      }
    } else {
      info("Skipping PR reporting - no Pull Request context available.");
    }
  } catch (error) {
    setFailed(`Action execution error: ${error.message}`);
  }
}

run();
