import React, { useState, useEffect, useCallback } from 'react';
import ConnectPanel from './components/ConnectPanel';
import RunbookView from './components/RunbookView';
import StatsPanel from './components/StatsPanel';
import './App.css';

export default function App({ vscode }) {
  const [screen, setScreen] = useState('connect');
  const [config, setConfig] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState(null);
  const [records, setRecords] = useState(null);
  const [prContent, setPrContent] = useState(null);
  const [prGenerating, setPrGenerating] = useState(false);
  const [wasCompleted, setWasCompleted] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const send = useCallback((type, extra = {}) => {
    if (vscode) vscode.postMessage({ type, ...extra });
  }, [vscode]);

  useEffect(() => {
    const handler = (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'init':
          if (msg.config) setConfig(msg.config);
          if (msg.records) setRecords(msg.records);
          break;
        case 'generating':
          setLoading(true); setLoadingMsg(msg.text || 'Loading…'); setError(null);
          break;
        case 'loaded':
          setTicket(msg.ticket);
          setSteps(msg.steps);
          setWasCompleted(msg.wasCompleted || false);
          setLoading(false); setError(null);
          setPrContent(null); setPrGenerating(false);
          setShowStats(false);
          setScreen('runbook');
          break;
        case 'error':
          setError(msg.message); setLoading(false);
          break;
        case 'recordsUpdate':
          setRecords(msg.records);
          break;
        case 'prGenerating':
          setPrGenerating(true); setPrContent(null);
          break;
        case 'prReady':
          setPrContent(msg.content); setPrGenerating(false);
          break;
        case 'ticketCleared':
          setTicket(null); setSteps([]);
          setPrContent(null); setPrGenerating(false);
          setShowStats(false);
          setScreen('connect');
          break;
        default: break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const persist = useCallback((nextSteps) => {
    send('save', { steps: nextSteps });
  }, [send]);

  const handleConnect = (provider, ticketId, cfg) => {
    setError(null);
    send('fetchTicket', { provider, ticketId, config: cfg });
  };

  const handleStepsChange = useCallback((nextSteps) => {
    setSteps(nextSteps);
    persist(nextSteps);
  }, [persist]);

  const handleSaveConfig = (cfg) => {
    setConfig(cfg);
    send('saveConfig', { config: cfg });
  };

  // Stats on connect screen — full page since no timers running
  if (screen === 'connect' && showStats) {
    return (
      <StatsPanel
        records={records}
        onBack={() => setShowStats(false)}
      />
    );
  }

  // Runbook screen — stats as modal so timers keep running
  if (screen === 'runbook' && ticket) {
    return (
      <>
        <RunbookView
          ticket={ticket}
          steps={steps}
          records={records}
          prContent={prContent}
          prGenerating={prGenerating}
          wasCompleted={wasCompleted}
          onStepsChange={handleStepsChange}
          onBack={() => send('clearTicket')}
          onStats={() => setShowStats(true)}
          onGeneratePR={(s) => send('generatePR', { steps: s })}
          onExportMarkdown={(s) => send('exportMarkdown', { steps: s })}
          onRunCommand={(cmd) => send('runCommand', { command: cmd })}
          onCopy={(text) => send('copyToClipboard', { text })}
          onTicketCompleted={(totalTime, stepsCount) => send('ticketCompleted', { totalTime, stepsCount })}
          onTicketUncompleted={() => send('ticketUncompleted')}
        />

        {/* Stats as modal — timers keep running underneath */}
        {showStats && (
          <div className="modal-overlay" onClick={() => setShowStats(false)}>
            <div className="modal-box stats-modal" onClick={e => e.stopPropagation()}>
              <StatsPanel
                records={records}
                isModal={true}
                onBack={() => setShowStats(false)}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <ConnectPanel
      config={config}
      loading={loading}
      loadingMsg={loadingMsg}
      error={error}
      records={records}
      onConnect={handleConnect}
      onStats={() => setShowStats(true)}
      onSaveConfig={handleSaveConfig}
      onClearAll={() => {
        send('clearAll');
        setConfig({});
        setRecords(null);
      }}
    />
  );
}