import React from 'react';
import QuickQuestions from './QuickQuestions';

const Sidebar = ({ matchCount, onQuickQuestion, quickQuestions }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3>📚 Quick Questions</h3>
        <QuickQuestions 
          questions={quickQuestions} 
          onQuestionClick={onQuickQuestion} 
        />
      </div>
      
      <div className="sidebar-section">
        <h3>⚙️ Settings</h3>
        <div className="settings-info">
          <p><strong>Current Match Count:</strong> {matchCount}</p>
          <p className="info-text">
            Higher match count retrieves more context from your PDF
          </p>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>💡 Tips</h3>
        <ul className="tips-list">
          <li>Ask specific questions for better answers</li>
          <li>Try asking about tables or figures</li>
          <li>Request summaries of sections</li>
          <li>The AI can handle casual conversation too!</li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;