# 📊 Review Summary Action

A modern GitHub Action that aggregates code quality results (ESLint and TSC) into a clean, consolidated report directly in your Pull Request comments.

## 🚀 Features

- **✅ Clean PR Reports**: Summarizes results from multiple lint/check steps into a single, easy-to-read table.
- **🔄 Smart Updates**: Instead of cluttering your PR with new comments, this action identifies its previous report and updates it in place.
- **🛡️ Failure Visibility**: Instantly see which quality check caused a failure without digging through workflow logs.
- **💡 Built for Speed**: Uses GitHub's standard status outcomes to report results accurately.

## 🛠️ Usage

Integrate this action into your workflow **after** your quality checks (like ESLint or TSC). This action automatically identifies the status of your **Jobs** (Check Runs) by communicating with the GitHub Checks API.

### 🔐 Required Permissions

For this action to fetch job results and post/update comments, your workflow must have the following permissions:

```yaml
permissions:
  pull-requests: write # Required to post/update the PR comment
  checks: read         # Required to fetch the status of other jobs
  contents: read       # Good practice for checking out code
```

### Example Workflow

Since this action uses the Checks API, it looks for the status of **individual Jobs**. Ensure your quality checks are defined as separate jobs:

```yaml
name: Code Quality

on:
  pull_request:
    branches: [main]

jobs:
  eslint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  tsc:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run tsc

  summary:
    name: Code Quality Summary
    runs-on: ubuntu-latest
    needs: [eslint, tsc]
    if: always()
    permissions:
      pull-requests: write
      checks: read
      contents: read
    steps:
      - name: 📝 Post Quality Summary
        uses: build-for-ex/quality-summary@v1
        with:
          checks: "eslint, tsc"
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## 📥 Inputs

| Input | Description | Required | Default |
| :--- | :--- | :---: | :--- |
| `checks` | Comma-separated list of Job names to include in the summary. | **No** | `eslint, tsc` |
| `github_token` | The `GITHUB_TOKEN` to post/update comments. | **Yes** | `${{ github.token }}` |

## 📝 Example Output

### ❌ Code Quality Review Failure
Some checks did not pass in the latest run. Below is the summary of results:

| Check | Status |
| :--- | :--- |
| ESLint | ✅ Passed |
| TSC | ❌ Failed |

_Detailed logs can be found in the GitHub Actions workflow run._

---

## 🏗️ Building and Testing

If you are contributing to this action, remember to rebuild the distribution bundle after making changes:

```bash
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
