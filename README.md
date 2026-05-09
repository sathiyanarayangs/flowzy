# Flowzy ⚡

Flowzy is a VS Code sidebar extension that connects to your project management tools (Jira, Azure DevOps, GitHub) and automatically generates AI-powered step-by-step implementation plans for your tickets — right inside VS Code.

## Features

- 🎯 Fetch tickets from Jira, Azure DevOps, or GitHub
- ✨ AI-generated implementation steps using GitHub Copilot
- 📋 Export runbooks as Markdown
- 🔀 Generate PR descriptions with AI
- ▶️ Run terminal commands directly from steps
- 💾 Auto-saves your progress per ticket
- 🏆 Tracks completed tickets and personal records
- 📊 Streak tracking for daily completions

## Installation

- Install Flowzy Dev from the VS Code Marketplace
- Click the ⬡ icon in the left activity bar to open it
- Configure your provider credentials on first launch
---

## Setup

### Jira

| Field | Value |
|---|---|
| Jira URL | `https://your-org.atlassian.net` |
| Email | Your Atlassian account email |
| API Token | Generate at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens) |

### Azure DevOps

| Field | Value |
|---|---|
| Org URL | `https://dev.azure.com/your-org` |
| Project | Your project name |
| PAT | Generate a Personal Access Token in Azure DevOps settings |

### GitHub

| Field | Value |
|---|---|
| GitHub Token | Generate at GitHub → Settings → Developer settings → Personal access tokens |
| Owner | Repository owner (username or org) |
| Repo | Repository name |

---

## How to Use

### 1. Open Flowzy
Click the icon in the left activity bar, or press `Ctrl+Shift+P` and run `Flowzy: Open`.

### 2. Configure Credentials
On first launch, select your provider (Jira / Azure / GitHub) and fill in your credentials, credentials are stored locally in VS Code's secure storage.

### 3. Fetch a Ticket
Enter your ticket ID (e.g. `PROJ-123` for Jira, `42` for GitHub) and click **Fetch**. Flowzy will:

- Pull ticket title, type, state, story points, and assignee
- Extract text from acceptance criteria (falls back to description if not found)
- Generate AI-powered implementation steps via GitHub Copilot

### 4. Work Through the Steps

- Check off steps as you complete them
- Steps are **auto-saved** — come back anytime and your progress is intact
- Run any terminal command directly from a step using the Run ▶️ button

### 5. Mark Ticket Complete
When all steps are done, mark the ticket as complete. Flowzy records your completion time and tracks your fastest ticket.

### 6. Export

- **Export Markdown** — saves a full runbook as a `.md` file
- **Generate PR Description** — AI writes a PR description based on your ticket and steps

---

## How AI Steps Are Generated

1. Flowzy first tries **GitHub Copilot** to generate intelligent, context-aware steps
2. If Copilot is unavailable, it falls back to a **built-in step generator** based on the ticket content
3. Steps are generated from **acceptance criteria** if available, otherwise from the ticket description

---


## Data & Privacy

- All credentials are stored **locally** in VS Code's built-in secure storage
- No data is sent to any external Flowzy server
- AI generation goes through **GitHub Copilot** (your existing subscription)

---

## Troubleshooting

**Sidebar not showing?**
→ Click the icon in the activity bar, or run `Flowzy: Open` from the command palette.

**"No data provider" error?**
→ Uninstall and reinstall the extension.

**Steps not generating?**
→ Make sure GitHub Copilot is installed and active. Flowzy will fall back to basic steps if Copilot is unavailable.

**Jira acceptance criteria not found?**
→ Flowzy uses `customfield_10029` for acceptance criteria. If your Jira instance uses a different field ID, it will automatically fall back to the ticket description.

---

## Feedback & Issues

Found a bug or have a feature request? Open an issue on [GitHub](https://github.com/sathiyanarayangs/flowzy).

---

*Built for developers who want to stay in flow. ⚡*
