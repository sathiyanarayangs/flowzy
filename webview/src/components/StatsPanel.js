import React from 'react';

function fmt(s) {
  if (!s || s <= 0) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getThisWeekCount(completedTickets) {
  if (!completedTickets?.length) return 0;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return completedTickets.filter(t => new Date(t.date).getTime() >= oneWeekAgo).length;
}

function getAvgTime(totalTimeSpent, totalTicketsDone) {
  if (!totalTicketsDone || !totalTimeSpent) return 0;
  return Math.round(totalTimeSpent / totalTicketsDone);
}

export default function StatsPanel({ records, onBack, isModal }) {
  const total = records?.totalTicketsDone || 0;
  const totalTime = Math.max(0, records?.totalTimeSpent || 0);
  const fastest = records?.fastestTicket;
  const recent = records?.completedTickets || [];
  const thisWeek = getThisWeekCount(recent);
  const avgTime = getAvgTime(totalTime, total);

  return (
    <div className={isModal ? 'stats-modal-inner' : 'app'}>
      <div className="stats-header">
        {isModal ? (
          <>
            <h2>📊 My Stats</h2>
            <button className="btn-icon btn-del" onClick={onBack}>✕</button>
          </>
        ) : (
          <>
            <button className="btn-back" onClick={onBack}>← Back</button>
            <h2>📊 My Stats</h2>
          </>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <span className="stat-val">{total}</span>
          <span className="stat-lbl">Total Done</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <span className="stat-val">{thisWeek}</span>
          <span className="stat-lbl">This Week</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏱</span>
          <span className="stat-val">{fmt(totalTime)}</span>
          <span className="stat-lbl">Total Time</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⚡</span>
          <span className="stat-val">{fmt(avgTime)}</span>
          <span className="stat-lbl">Avg per Ticket</span>
        </div>
      </div>

      {fastest && (
        <div className="record-card">
          <p className="record-label">🏆 Personal Record — Fastest Ticket</p>
          <p className="record-title">#{fastest.id}: {fastest.title}</p>
          <p className="record-sub">{fmt(fastest.timeSpent)} · {fmtDate(fastest.date)}</p>
        </div>
      )}

      {recent.length > 0 && (
        <div className="recent-section">
          <p className="section-label">Recent Tickets</p>
          {recent.slice(0, 10).map((t, i) => (
            <div key={i} className="recent-row">
              <span className="recent-id">#{t.id}</span>
              <span className="recent-title">{t.title}</span>
              <span className="recent-time">{fmt(t.timeSpent)}</span>
              <span className="recent-date">{fmtDate(t.date)}</span>
            </div>
          ))}
        </div>
      )}

      {total === 0 && (
        <div className="empty-stats">
          <p>Complete your first ticket to see stats here!</p>
        </div>
      )}
    </div>
  );
}