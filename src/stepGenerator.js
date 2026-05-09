function htmlToText(html) {
  if (!html) return '';
  if (typeof html === 'object') return extractAtlassianDoc(html);
  return html
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n').replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function extractAtlassianDoc(doc) {
  if (!doc || !doc.content) return '';
  const lines = [];
  function walk(nodes) {
    for (const node of nodes || []) {
      if (node.type === 'text') lines.push(node.text || '');
      else if (node.type === 'hardBreak') lines.push('\n');
      else if (node.type === 'paragraph') { walk(node.content); lines.push('\n'); }
      else if (node.type === 'listItem') { lines.push('• '); walk(node.content); }
      else if (node.content) walk(node.content);
    }
  }
  walk(doc.content);
  return lines.join('').replace(/\n{3,}/g, '\n\n').trim();
}

function parseIntoSteps(text) {
  if (!text) return [];
  return text.split('\n')
    .map((l) => l.trim())
    .map((l) => l.replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '').trim())
    .filter((l) => l.length > 2)
    .map((line, i) => ({
      id: `step-${i + 1}-${Date.now() + i}`,
      title: line, description: '', commands: [],
      checked: false, timeSpent: 0, startedAt: null,
    }));
}

function makeGitSteps(ticketId, ticketTitle) {
  const branch = `feature/${ticketId}-${ticketTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
  return [
    {
      id: `git-setup-${Date.now()}`,
      title: '🔀 Setup — Fetch & Create Branch',
      description: 'Pull latest and create your feature branch.',
      commands: ['git fetch origin', `git checkout -b ${branch}`, 'git status'],
      checked: false, timeSpent: 0, startedAt: null, isGitStep: true,
    },
    {
      id: `git-test-${Date.now() + 1}`,
      title: '🧪 Write & Run Unit Tests',
      description: 'Write tests for your changes and make sure they pass.',
      commands: ['npm test', 'npm run lint'],
      checked: false, timeSpent: 0, startedAt: null, isGitStep: true,
    },
    {
      id: `git-commit-${Date.now() + 2}`,
      title: '💾 Commit & Push Changes',
      description: 'Stage all changes and push to remote.',
      commands: ['git add -A', `git commit -m "feat(#${ticketId}): ${ticketTitle.slice(0, 60)}"`, 'git push origin HEAD'],
      checked: false, timeSpent: 0, startedAt: null, isGitStep: true,
    },
    {
      id: `git-pr-${Date.now() + 3}`,
      title: '📝 Create PR',
      description: 'Generate PR description and raise a pull request.',
      commands: [],
      checked: false, timeSpent: 0, startedAt: null, isGitStep: true, isPRStep: true,
    },
  ];
}

async function generateStepsWithCopilot(ticketId, ticketTitle, sourceText) {
  const vscode = require('vscode');
  const gitSteps = makeGitSteps(ticketId, ticketTitle);

  let models = [];
  try {
    models = await vscode.lm.selectChatModels({ family: 'gpt-4o' });
    if (!models?.length) models = await vscode.lm.selectChatModels();
  } catch (e) {}

  if (!models?.length) {
    return [...gitSteps.slice(0, 1), ...parseIntoSteps(sourceText), ...gitSteps.slice(1)];
  }

  try {
    const model = models[0];
    const prompt = `You are a developer assistant. Given this ticket, generate a numbered list of clear, concise developer tasks.

Ticket Title: ${ticketTitle}
Ticket Content: ${sourceText || 'No description provided.'}

Rules:
- Return ONLY a numbered list, nothing else
- Each step must be ONE clear action line (max 10 words)
- Between 3 and 8 steps
- No git steps (no checkout, commit, push, branch)
- No test steps
- No PR steps
- Rephrase paragraphs into short developer-friendly bullet points
- Example:
1. Create login form with email and password fields
2. Add client-side validation for inputs
3. Connect form to authentication API`;

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const cts = new vscode.CancellationTokenSource();
    let fullResponse = '';
    const response = await model.sendRequest(messages, {}, cts.token);
    for await (const chunk of response.text) fullResponse += chunk;

    const parsed = parseIntoSteps(fullResponse);
    if (parsed.length > 0) {
      return [...gitSteps.slice(0, 1), ...parsed, ...gitSteps.slice(1)];
    }
  } catch (e) {}

  return [...gitSteps.slice(0, 1), ...parseIntoSteps(sourceText), ...gitSteps.slice(1)];
}

function generateSteps(ticketId, ticketTitle, sourceText) {
  const gitSteps = makeGitSteps(ticketId, ticketTitle);
  const parsed = parseIntoSteps(sourceText);
  if (!parsed.length) parsed.push({
    id: `step-1-${Date.now()}`, title: 'Review and implement the ticket',
    description: '', commands: [], checked: false, timeSpent: 0, startedAt: null,
  });
  return [...gitSteps.slice(0, 1), ...parsed, ...gitSteps.slice(1)];
}

module.exports = { generateSteps, generateStepsWithCopilot, htmlToText, extractAtlassianDoc };
