import React, { useState, useEffect } from 'react';

export default function ConnectPanel({ config, loading, loadingMsg, error, records, onConnect, onStats, onSaveConfig, onClearAll }) {
  const [provider, setProvider] = useState('azure');
  const [confirmClear, setConfirmClear] = useState(false);

  // Separate ticket IDs per provider
  const [azureTicketId, setAzureTicketId] = useState('');
  const [jiraTicketId, setJiraTicketId] = useState('');
  const [githubTicketId, setGithubTicketId] = useState('');

  // Separate form state per provider
  const [azureForm, setAzureForm] = useState({ orgUrl: '', project: '', pat: '' });
  const [jiraForm, setJiraForm] = useState({ jiraUrl: '', jiraEmail: '', jiraToken: '' });

  const [githubForm, setGithubForm] = useState({
    githubToken: '',
    githubOwner: '',
    githubRepo: '',
  });
  useEffect(() => {
    if (config) {
      // Restore azure fields
      setAzureForm({
        orgUrl: config.orgUrl || '',
        project: config.project || '',
        pat: config.pat || '',
      });
      // Restore jira fields
      setJiraForm({
        jiraUrl: config.jiraUrl || '',
        jiraEmail: config.jiraEmail || '',
        jiraToken: config.jiraToken || '',
      });

      setGithubForm({
    githubToken: config.githubToken || '',
    githubOwner: config.githubOwner || '',
    githubRepo: config.githubRepo || '',
  });
  if (config.lastGithubTicketId) setGithubTicketId(config.lastGithubTicketId);
      // Restore last provider
      if (config.lastProvider) setProvider(config.lastProvider);
      // Restore last ticket id per provider
      if (config.lastAzureTicketId) setAzureTicketId(config.lastAzureTicketId);
      if (config.lastJiraTicketId) setJiraTicketId(config.lastJiraTicketId);
    }
  }, [config]);

  const setAzure = (k, v) => setAzureForm(f => ({ ...f, [k]: v }));
  const setJira = (k, v) => setJiraForm(f => ({ ...f, [k]: v }));

  const currentTicketId = provider === 'azure'
    ? azureTicketId
    : provider === 'jira'
    ? jiraTicketId
    : githubTicketId;

  const setCurrentTicketId = provider === 'azure'
    ? setAzureTicketId
    : provider === 'jira'
    ? setJiraTicketId
    : setGithubTicketId;

  const handleSubmit = (overrideTicketId) => {
    const id = (overrideTicketId || currentTicketId || '').trim();
    if (!id) return;

    const updatedConfig = {
      ...azureForm,
      ...jiraForm,
      ...githubForm,
      lastProvider: provider,
      lastAzureTicketId: provider === 'azure' ? id : azureTicketId,
      lastJiraTicketId: provider === 'jira' ? id : jiraTicketId,
      lastGithubTicketId: provider === 'github' ? id : githubTicketId,
    };
    onSaveConfig(updatedConfig);

    const credentials = provider === 'azure'
      ? azureForm
      : provider === 'jira'
      ? jiraForm
      : githubForm;
    onConnect(provider, id, credentials);
  };

  const handleClearConfirmed = () => {
    onClearAll();
    setAzureForm({ orgUrl: '', project: '', pat: '' });
    setJiraForm({ jiraUrl: '', jiraEmail: '', jiraToken: '' });
    setGithubForm({ githubToken: '', githubOwner: '', githubRepo: '' });
    setGithubTicketId('');
    setAzureTicketId('');
    setJiraTicketId('');
    setConfirmClear(false);
  };

  // Resume button shows last ticket for current provider
  const lastTicketId = provider === 'azure'
  ? config?.lastAzureTicketId
  : provider === 'jira'
  ? config?.lastJiraTicketId
  : config?.lastGithubTicketId;

  const streak = records?.streak?.current || 0;
  const totalDone = records?.totalTicketsDone || 0;

  return (
    <div className="connect-page">
      <div className="flowzy-header">
        <div className="flowzy-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">Flowzy</span>
        </div>
        <div className="header-right">
          {streak > 1 && <span className="streak-pill">🔥 {streak} day streak</span>}
          {totalDone > 0 && <span className="done-pill">✅ {totalDone} done</span>}
          <button className="btn-icon-header" onClick={onStats} title="Stats">📊</button>
        </div>
      </div>

      <div className="connect-body">

        {/* Provider tabs */}
        <div className="provider-tabs">
          <button
            className={`tab ${provider === 'azure' ? 'tab-active' : ''}`}
            onClick={() => setProvider('azure')}
          >
            Azure DevOps
          </button>
          <button
            className={`tab ${provider === 'jira' ? 'tab-active' : ''}`}
            onClick={() => setProvider('jira')}
          >
            Jira
          </button>
          <button className={`tab ${provider === 'github' ? 'tab-active' : ''}`} onClick={() => setProvider('github')}>
            GitHub
          </button>
        </div>

        {/* Resume last ticket — per provider */}
        {lastTicketId && (
          <button className="btn-last-ticket" onClick={() => handleSubmit(lastTicketId)}>
            ↩ Resume last ticket: <strong>#{lastTicketId}</strong>
            <span className="last-provider">
              ({provider === 'azure' ? 'Azure DevOps' : provider === 'jira' ? 'Jira' : 'GitHub'})
            </span>
          </button>
        )}

        {/* Azure DevOps fields */}
        {provider === 'azure' && (
          <div className="form-section">
            <label>Organization URL</label>
            <input
              className="field"
              placeholder="https://dev.azure.com/yourorg"
              value={azureForm.orgUrl}
              onChange={e => setAzure('orgUrl', e.target.value)}
            />
            <label>Project Name</label>
            <input
              className="field"
              placeholder="MyProject"
              value={azureForm.project}
              onChange={e => setAzure('project', e.target.value)}
            />
            <label>Personal Access Token</label>
            <input
              className="field"
              type="password"
              placeholder="PAT with Work Items: Read"
              value={azureForm.pat}
              onChange={e => setAzure('pat', e.target.value)}
            />
          </div>
        )}

        {/* Jira fields */}
        {provider === 'jira' && (
          <div className="form-section">
            <label>Jira URL</label>
            <input
              className="field"
              placeholder="https://yourorg.atlassian.net"
              value={jiraForm.jiraUrl}
              onChange={e => setJira('jiraUrl', e.target.value)}
            />
            <label>Email</label>
            <input
              className="field"
              placeholder="you@company.com"
              value={jiraForm.jiraEmail}
              onChange={e => setJira('jiraEmail', e.target.value)}
            />
            <label>API Token</label>
            <input
              className="field"
              type="password"
              placeholder="Jira API Token"
              value={jiraForm.jiraToken}
              onChange={e => setJira('jiraToken', e.target.value)}
            />
          </div>
        )}

        {provider === 'github' && (
          <div className="form-section">
            <label>Personal Access Token</label>
            <input
              className="field"
              type="password"
              placeholder="GitHub PAT with repo scope"
              value={githubForm.githubToken}
              onChange={e => setGithubForm(f => ({ ...f, githubToken: e.target.value }))}
            />
            <label>Owner (username or org)</label>
            <input
              className="field"
              placeholder="e.g. facebook"
              value={githubForm.githubOwner}
              onChange={e => setGithubForm(f => ({ ...f, githubOwner: e.target.value }))}
            />
            <label>Repository</label>
            <input
              className="field"
              placeholder="e.g. react"
              value={githubForm.githubRepo}
              onChange={e => setGithubForm(f => ({ ...f, githubRepo: e.target.value }))}
            />
          </div>
        )}

        {/* Ticket ID — separate per provider */}
        <div className="ticket-input-row">
          <input
            className="field ticket-field"
            placeholder={
              provider === 'azure' ? 'Work Item ID e.g. 1234' :
              provider === 'jira' ? 'Issue Key e.g. PROJ-123' :
              'Issue number e.g. 42'
            }
            value={currentTicketId}
            onChange={e => setCurrentTicketId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <button className="btn-load" onClick={() => handleSubmit()} disabled={loading}>
            {loading ? '…' : 'Load →'}
          </button>
        </div>

        {loading && <p className="loading-msg">⏳ {loadingMsg}</p>}
        {error && <div className="error-msg">⚠️ {error}</div>}

        {/* Commands */}
        <div className="commands-bar">
          <span className="cmd-label">Commands</span>
          {!confirmClear ? (
            <button className="cmd-btn" onClick={() => setConfirmClear(true)}>
              Clear All Data
            </button>
          ) : (
            <div className="confirm-clear">
              <span className="confirm-text">Are you sure?</span>
              <button className="cmd-btn cmd-btn-danger" onClick={handleClearConfirmed}>
                Yes, Clear
              </button>
              <button className="cmd-btn" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}