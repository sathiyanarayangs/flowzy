import React, { useState, useEffect, useRef } from 'react';

function formatTime(s) {
  if (!s) return '0m 0s';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
}

export default function StepCard({
  step, index, total,
  onChange, onDelete, onMoveUp, onMoveDown,
  onRunCommand, onGeneratePR
}) {
  // Display state
  const [elapsed, setElapsed] = useState(step.timeSpent || 0);
  const [running, setRunning] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(step.title);
  const [expanded, setExpanded] = useState(false);
  const [editCmd, setEditCmd] = useState(null);
  const [editCmdVal, setEditCmdVal] = useState('');
  const [addingCmd, setAddingCmd] = useState(false);
  const [newCmd, setNewCmd] = useState('');

  // Refs — needed so setInterval always reads latest value
  const elapsedRef = useRef(step.timeSpent || 0);
  const intervalRef = useRef(null);

  // When step loads or step id changes — restore saved time
  useEffect(() => {
    elapsedRef.current = step.timeSpent || 0;
    setElapsed(step.timeSpent || 0);
  }, [step.id]);

  // On unmount (navigate away) — save current time, clear interval
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        onChange({ timeSpent: elapsedRef.current });
      }
    };
  }, []);

  const startTimer = () => {
    if (intervalRef.current) return; // already running
    setRunning(true);
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      // Remove periodic onChange — only save on stop/unmount/check
    }, 1000);
  };

  const stopTimer = () => {
    if (!intervalRef.current) return; // already stopped
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    // Save immediately when stopped
    onChange({ timeSpent: elapsedRef.current });
  };

  const handleCheck = () => {
    // Stop timer first synchronously
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRunning(false);
    }
    // Save time and checked state together in one single call
    onChange({
      checked: !step.checked,
      timeSpent: elapsedRef.current,
    });
  };

  const saveTitleEdit = () => {
    onChange({ title: titleVal });
    setEditTitle(false);
  };

  const saveCmd = (i) => {
    const cmds = [...(step.commands || [])];
    cmds[i] = editCmdVal;
    onChange({ commands: cmds });
    setEditCmd(null);
  };

  const deleteCmd = (i) => {
    const cmds = [...(step.commands || [])];
    cmds.splice(i, 1);
    onChange({ commands: cmds });
  };

  const addCmd = () => {
    if (!newCmd.trim()) return;
    onChange({ commands: [...(step.commands || []), newCmd.trim()] });
    setNewCmd('');
    setAddingCmd(false);
  };

  const isGit = step.isGitStep;
  const isPR = step.isPRStep;
  const hasCommands = step.commands?.length > 0;

  return (
    <div className={`step-card ${step.checked ? 'step-done' : ''} ${isGit ? 'step-git' : ''} ${isPR ? 'step-pr' : ''}`}>
      <div className="step-header">
        <div className="step-left">
          <input
            type="checkbox"
            className="step-cb"
            checked={step.checked}
            onChange={handleCheck}
          />
          <span className="step-num">{index + 1}</span>
          {editTitle ? (
            <input
              className="title-edit"
              value={titleVal}
              autoFocus
              onChange={e => setTitleVal(e.target.value)}
              onBlur={saveTitleEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') saveTitleEdit();
                if (e.key === 'Escape') { setTitleVal(step.title); setEditTitle(false); }
              }}
            />
          ) : (
              <span
                className="step-title"
                onDoubleClick={() => !isGit && setEditTitle(true)}
                title={step.title}
              >
                {step.title}
              </span>
          )}
        </div>

        <div className="step-right">
          <span className={`timer ${running ? 'timer-on' : ''}`}>
            {formatTime(elapsed)}
          </span>

          {/* Show timer controls only if step is not done */}
          {!step.checked && (
            running
              ? <button className="btn-icon" onClick={stopTimer} title="Pause">⏸</button>
              : <button className="btn-icon" onClick={startTimer} title="Start timer">▶</button>
          )}

          {hasCommands && (
            <button className="btn-icon" onClick={() => setExpanded(!expanded)}>
              {expanded ? '▲' : '▼'}
            </button>
          )}

          {isPR && (
            <button className="btn-pr-gen" onClick={onGeneratePR}>Generate PR</button>
          )}

          <div className="move-btns">
            <button className="btn-move" onClick={onMoveUp} disabled={index === 0}>↑</button>
            <button className="btn-move" onClick={onMoveDown} disabled={index === total - 1}>↓</button>
          </div>

          <button className="btn-del" onClick={onDelete}>✕</button>
        </div>
      </div>

      {/* Commands */}
      {expanded && hasCommands && (
        <div className="step-body">
          <p className="cmds-label">Terminal Commands</p>
          {step.commands.map((cmd, i) => (
            <div key={i} className="cmd-row">
              {editCmd === i ? (
                <>
                  <input
                    className="cmd-edit-input"
                    value={editCmdVal}
                    onChange={e => setEditCmdVal(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveCmd(i);
                      if (e.key === 'Escape') setEditCmd(null);
                    }}
                    autoFocus
                  />
                  <button className="btn-sm btn-primary" onClick={() => saveCmd(i)}>Save</button>
                  <button className="btn-sm" onClick={() => setEditCmd(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <code className="cmd-text">$ {cmd}</code>
                  <div className="cmd-btns">
                    <button className="btn-run" onClick={() => onRunCommand(cmd)}>▶ Run</button>
                    <button className="btn-sm" onClick={() => { setEditCmd(i); setEditCmdVal(cmd); }}>Edit</button>
                    <button className="btn-sm" onClick={() => navigator.clipboard.writeText(cmd)}>Copy</button>
                    <button className="btn-sm btn-danger" onClick={() => deleteCmd(i)}>✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
          {addingCmd ? (
            <div className="cmd-row">
              <input
                className="cmd-edit-input"
                placeholder="New command…"
                value={newCmd}
                onChange={e => setNewCmd(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addCmd();
                  if (e.key === 'Escape') setAddingCmd(false);
                }}
                autoFocus
              />
              <button className="btn-sm btn-primary" onClick={addCmd}>Add</button>
              <button className="btn-sm" onClick={() => setAddingCmd(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn-add-cmd" onClick={() => setAddingCmd(true)}>+ Add command</button>
          )}
        </div>
      )}
    </div>
  );
}