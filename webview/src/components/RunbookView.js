import React, { useState, useEffect, useRef, useCallback } from 'react';
import StepCard from './StepCard';
import PRPanel from './PRPanel';
import StatsPanel from './StatsPanel';

export default function RunbookView({
  ticket, steps: initialSteps, records, prContent, prGenerating, wasCompleted,
  onStepsChange, onBack, onStats, onCloseStats, showStats, onGeneratePR,
  onExportMarkdown, onRunCommand, onCopy, onTicketCompleted, onTicketUncompleted
}) {
  const [steps, setSteps] = useState(initialSteps || []);
  const [addingStep, setAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [showPR, setShowPR] = useState(false);
  const firedRef = useRef(wasCompleted || false);
  const updateTimerRef = useRef({});

  useEffect(() => {
    setSteps(initialSteps || []);
    firedRef.current = wasCompleted || false;
  }, [ticket?.id]);

  const completedCount = steps.filter(s => s.checked).length;
  const progress = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;
  const allDone = steps.length > 0 && completedCount === steps.length;
  const streak = records?.streak?.current || 0;

  useEffect(() => {
  if (allDone && !firedRef.current) {
    firedRef.current = true;
    // Small delay so all StepCard onChange({ timeSpent }) calls flush first
    setTimeout(() => {
      setSteps(latest => {
        const totalTime = latest.reduce((acc, s) => acc + (s.timeSpent || 0), 0);
        onTicketCompleted(totalTime, latest.length);
        return latest;
      });
    }, 300);
  } else if (!allDone && firedRef.current) {
    firedRef.current = false;
    onTicketUncompleted();
  }
}, [allDone]);

  const updateStep = useCallback((id, patch) => {
    if (Object.keys(patch).length === 1 && 'timeSpent' in patch) {
      clearTimeout(updateTimerRef.current[id]);
      updateTimerRef.current[id] = setTimeout(() => {
        setSteps(prev => {
          const next = prev.map(s => s.id === id ? { ...s, ...patch } : s);
          onStepsChange(next);
          return next;
        });
      }, 1000);
      return;
    }

    clearTimeout(updateTimerRef.current[id]);
    setSteps(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...patch } : s);
      onStepsChange(next);
      return next;
    });
  }, [onStepsChange]);

  const deleteStep = useCallback((id) => {
    setSteps(prev => {
      const next = prev.filter(s => s.id !== id);
      onStepsChange(next);
      return next;
    });
  }, [onStepsChange]);

  const moveStep = useCallback((id, dir) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const ti = idx + dir;
      if (ti < 0 || ti >= next.length) return prev;
      [next[idx], next[ti]] = [next[ti], next[idx]];
      onStepsChange(next);
      return next;
    });
  }, [onStepsChange]);

  const addStep = () => {
    if (!newStepTitle.trim()) return;
    const newStep = {
      id: `step-custom-${Date.now()}`,
      title: newStepTitle.trim(),
      description: '', commands: [],
      checked: false, timeSpent: 0, startedAt: null,
    };
    setSteps(prev => {
      const next = [...prev, newStep];
      onStepsChange(next);
      return next;
    });
    setNewStepTitle('');
    setAddingStep(false);
  };

  const handleGeneratePR = () => {
    setShowPR(true);
    onGeneratePR(steps);
  };

  return (
    <>
      {/* Main runbook — always mounted, timers always running */}
      <div className="app">
        <div className="runbook-header">
          <div className="header-top">
            <div className="ticket-info">
              <button className="btn-back" onClick={onBack}>← Back</button>
              <span className="ticket-badge">
                {ticket.provider === 'jira' ? '🟦' : ticket.provider === 'github' ? '🟩' : '🟪'} #{ticket.id}
              </span>
              <span className="type-badge">{ticket.type}</span>
              <span className="state-badge">{ticket.state}</span>
              {ticket.points && <span className="pts-badge">{ticket.points}pt</span>}
            </div>
            <div className="header-actions">
              {streak > 1 && <span className="streak-pill">🔥 {streak}</span>}
              <button className="btn-ghost" onClick={onStats}>📊</button>
              <button className="btn-ghost" onClick={() => onExportMarkdown(steps)}>📄 Export</button>
              <button className="btn-ghost" onClick={handleGeneratePR}>🔀 PR</button>
            </div>
          </div>
          <h1 className="ticket-title">{ticket.title}</h1>
          {ticket.assignedTo && <p className="ticket-meta">👤 {ticket.assignedTo}</p>}
        </div>

        {allDone && (
          <div className="done-banner">
            🎉 All steps complete!
            <button className="btn-sm btn-primary" onClick={handleGeneratePR}>
              Generate PR Description
            </button>
          </div>
        )}

        <div className="progress-wrap">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-label">
            <span>{completedCount}/{steps.length} steps</span>
            <span className="progress-pct">{progress}%</span>
          </div>
        </div>

        <div className="steps-list">
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              total={steps.length}
              onChange={patch => updateStep(step.id, patch)}
              onDelete={() => deleteStep(step.id)}
              onMoveUp={() => moveStep(step.id, -1)}
              onMoveDown={() => moveStep(step.id, 1)}
              onRunCommand={onRunCommand}
              onGeneratePR={step.isPRStep ? handleGeneratePR : null}
            />
          ))}
        </div>

        <div className="add-step-wrap">
          {addingStep ? (
            <div className="add-step-form">
              <input
                autoFocus className="field"
                placeholder="Step title…"
                value={newStepTitle}
                onChange={e => setNewStepTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addStep();
                  if (e.key === 'Escape') setAddingStep(false);
                }}
              />
              <button className="btn-primary" onClick={addStep}>Add</button>
              <button className="btn-ghost" onClick={() => setAddingStep(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn-add-step" onClick={() => setAddingStep(true)}>+ Add Step</button>
          )}
        </div>
      </div>

      {/* Stats — modal overlay, RunbookView stays mounted underneath */}
      {showStats && (
        <div className="modal-overlay" onClick={onCloseStats}>
          <div className="modal-box stats-modal" onClick={e => e.stopPropagation()}>
            <StatsPanel records={records} onBack={onCloseStats} isModal={true} />
          </div>
        </div>
      )}

      {/* PR Panel */}
      {showPR && (
        <PRPanel
          content={prContent}
          generating={prGenerating}
          onClose={() => setShowPR(false)}
          onCopy={onCopy}
          onRegenerate={() => onGeneratePR(steps)}
        />
      )}
    </>
  );
}