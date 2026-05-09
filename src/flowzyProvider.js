const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const AzureDevOpsClient = require('./azureDevOps');
const JiraClient = require('./jira');
const GitHubClient = require('./github');
const { generateSteps, generateStepsWithCopilot, htmlToText } = require('./stepGenerator');
const { generatePRDescriptionWithAI, generateMarkdownExport } = require('./exportGenerator');

class FlowzySidebarProvider {
  constructor(extensionUri, storage, records) {
    this._extensionUri = extensionUri;
    this._storage = storage;
    this._records = records;
    this._ticket = null;
    this._ticketCompleted = false;
    this._view = null;
  }

  postMessage(msg) {
    if (this._view) this._view.webview.postMessage(msg);
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'webview', 'build')],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    setTimeout(() => {
      const savedConfig = this._storage.loadConfig();
      const savedRecords = this._records.getRecords();
      webviewView.webview.postMessage({ type: 'init', config: savedConfig || null, records: savedRecords });
    }, 500);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {

        case 'saveConfig':
          await this._storage.saveConfig(msg.config);
          break;

        case 'fetchTicket': {
          await this._storage.saveConfig({ ...msg.config, lastProvider: msg.provider, lastTicketId: msg.ticketId });
          webviewView.webview.postMessage({ type: 'generating', text: 'Fetching ticket…' });
          try {
            const { provider, ticketId, config } = msg;
            let ticket, sourceText;

            if (provider === 'azure') {
              const client = new AzureDevOpsClient(config.orgUrl, config.project, config.pat);
              const wi = await client.getWorkItem(ticketId);
              const fields = wi.fields;
              sourceText = htmlToText(fields['Microsoft.VSTS.Common.AcceptanceCriteria'])
                || htmlToText(fields['System.Description']) || '';
              ticket = {
                id: ticketId, provider: 'azure',
                title: fields['System.Title'] || 'Untitled',
                type: fields['System.WorkItemType'] || 'Work Item',
                state: fields['System.State'] || 'Unknown',
                points: fields['Microsoft.VSTS.Scheduling.StoryPoints'] || null,
                assignedTo: fields['System.AssignedTo']?.displayName || null,
              };
            } else if (provider === 'jira') {
              const client = new JiraClient(config.jiraUrl, config.jiraEmail, config.jiraToken);
              const issue = await client.getIssue(ticketId);
              const f = issue.fields;

              // Try all known acceptance criteria fields first, fall back to description
              const acceptanceCriteria =
                f.customfield_10029 ||  // your instance
                f.customfield_10028 ||  // other instances
                f.customfield_10030 ||  // other instances
                null;

              sourceText = htmlToText(acceptanceCriteria) || htmlToText(f.description) || '';

              ticket = {
                id: ticketId, provider: 'jira',
                title: f.summary || 'Untitled',
                type: f.issuetype?.name || 'Issue',
                state: f.status?.name || 'Unknown',
                points: f.story_points || f.customfield_10016 || null,
                assignedTo: f.assignee?.displayName || null,
              };
            } else if (provider === 'github') {
              const client = new GitHubClient(config.githubToken);
              const issue = await client.getIssue(config.githubOwner, config.githubRepo, ticketId);
              sourceText = issue.body || '';
              ticket = {
                id: ticketId, provider: 'github',
                title: issue.title || 'Untitled',
                type: issue.pull_request ? 'Pull Request' : 'Issue',
                state: issue.state || 'open',
                points: null,
                assignedTo: issue.assignee?.login || null,
              };
            }

            this._ticket = ticket;
            this._ticketCompleted = false;

            const saved = this._storage.load(ticketId);
            let steps;
            if (saved?.steps) {
              steps = saved.steps;
              const rec = this._records.getRecords();
              this._ticketCompleted = (rec.completedTicketIds || []).includes(ticketId);
              webviewView.webview.postMessage({ type: 'loaded', ticket, steps, wasCompleted: this._ticketCompleted });
            } else {
              webviewView.webview.postMessage({ type: 'generating', text: '✨ AI is generating your steps…' });
              try { steps = await generateStepsWithCopilot(ticketId, ticket.title, sourceText); }
              catch (e) { steps = generateSteps(ticketId, ticket.title, sourceText); }
              webviewView.webview.postMessage({ type: 'loaded', ticket, steps, wasCompleted: false });
            }
          } catch (err) {
            webviewView.webview.postMessage({ type: 'error', message: err.message });
          }
          break;
        }

        case 'save':
          if (this._ticket) {
            const existing = this._storage.load(this._ticket.id) || {};
            this._storage.save(this._ticket.id, { ...existing, steps: msg.steps, ticket: this._ticket });
          }
          break;

        case 'ticketCompleted':
          if (this._ticket && !this._ticketCompleted) {
            this._ticketCompleted = true;
            const rec = await this._records.recordTicketCompletion(
              this._ticket.id, this._ticket.title, msg.totalTime, msg.stepsCount
            );
            webviewView.webview.postMessage({ type: 'recordsUpdate', records: rec });
            let note = `🎉 Ticket #${this._ticket.id} complete!`;
            if (rec.fastestTicket?.id === this._ticket.id) note += ` ⚡ New personal record!`;
            vscode.window.showInformationMessage(note);
          }
          break;

        case 'ticketUncompleted':
          if (this._ticket) {
            this._ticketCompleted = false;
            const rec = await this._records.uncompleteTicket(this._ticket.id);
            webviewView.webview.postMessage({ type: 'recordsUpdate', records: rec });
          }
          break;

        case 'generatePR': {
          webviewView.webview.postMessage({ type: 'prGenerating' });
          try {
            const pr = await generatePRDescriptionWithAI(this._ticket, msg.steps);
            webviewView.webview.postMessage({ type: 'prReady', content: pr });
          } catch (e) {
            webviewView.webview.postMessage({ type: 'error', message: 'Failed to generate PR description.' });
          }
          break;
        }

        case 'exportMarkdown': {
          const md = generateMarkdownExport(this._ticket, msg.steps);
          const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`Flowzy-${this._ticket.id}.md`),
            filters: { Markdown: ['md'] },
          });
          if (uri) {
            fs.writeFileSync(uri.fsPath, md);
            const action = await vscode.window.showInformationMessage('Runbook exported!', 'Open File');
            if (action === 'Open File') vscode.workspace.openTextDocument(uri).then(d => vscode.window.showTextDocument(d));
          }
          break;
        }

        case 'runCommand': {
          let t = vscode.window.terminals.find(t => t.name === 'Flowzy');
          if (!t) t = vscode.window.createTerminal('Flowzy');
          t.show(true);
          t.sendText(msg.command);
          break;
        }

        case 'clearTicket':
          this._ticket = null;
          this._ticketCompleted = false;
          webviewView.webview.postMessage({ type: 'ticketCleared' });
          break;

        case 'clearAll':
          const keys = this._storage.listAll();
          keys.forEach(id => this._storage.delete(id));
          this._storage.storage.update('flowzy_config', undefined);
          this._storage.storage.update('flowzy_records', undefined);
          this._ticket = null;
          this._ticketCompleted = false;
          vscode.window.showInformationMessage('Flowzy: All data cleared!');
          webviewView.webview.postMessage({ type: 'init', config: null, records: null });
          break;

        case 'copyToClipboard':
          vscode.env.clipboard.writeText(msg.text);
          break;
      }
    });
  }

  _getHtml(webview) {
    const buildPath = vscode.Uri.joinPath(this._extensionUri, 'webview', 'build');
    const indexPath = path.join(buildPath.fsPath, 'index.html');

    if (!fs.existsSync(indexPath)) {
      return `<html><body style="color:white;padding:20px;font-family:sans-serif;">
        <h2>⚠️ Webview not built</h2>
        <p>Run: <code>cd webview && npm install && npm run build</code></p>
      </body></html>`;
    }

    const webviewUri = webview.asWebviewUri(buildPath);
    const nonce = Math.random().toString(36).slice(2);
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace(/(src|href)="\.\/static\//g, `$1="${webviewUri}/static/`);
    html = html.replace(/(src|href)="\/static\//g, `$1="${webviewUri}/static/`);
    const csp = [
      `default-src 'none'`,
      `style-src 'unsafe-inline' ${webview.cspSource}`,
      `script-src 'nonce-${nonce}' ${webview.cspSource}`,
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource}`,
    ].join('; ');
    html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`);
    html = html.replace(/<script /g, `<script nonce="${nonce}" `);
    return html;
  }
}

module.exports = FlowzySidebarProvider;