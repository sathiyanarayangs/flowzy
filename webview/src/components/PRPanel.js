import React, { useState } from 'react';

export default function PRPanel({ content, generating, onClose, onCopy, onRegenerate }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (content) { onCopy(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box pr-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔀 PR Description</h2>
          <button className="btn-icon btn-del" onClick={onClose}>✕</button>
        </div>

        {generating && (
          <div className="pr-generating">
            <div className="spinner" />
            <p>✨ AI is writing your PR description…</p>
          </div>
        )}

        {!generating && content && (
          <>
            <div className="pr-content">
              <pre className="pr-text">{content}</pre>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy to Clipboard'}
              </button>
              <button className="btn-ghost" onClick={onRegenerate}>↺ Regenerate</button>
              <button className="btn-ghost" onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {!generating && !content && (
          <div className="pr-empty">
            <p>Click Generate PR to create a PR description from your completed steps.</p>
            <button className="btn-primary" onClick={onRegenerate}>Generate PR</button>
          </div>
        )}
      </div>
    </div>
  );
}
