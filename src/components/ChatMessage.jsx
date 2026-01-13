import React from 'react';
import { User, Bot } from 'lucide-react';

const ChatMessage = ({ message }) => {
  // Function to render HTML content safely
  const renderMessageText = (text) => {
    if (!text) return '';
    
    // Basic HTML tag parsing
    const htmlText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      // Convert line breaks to <br/>
      .replace(/\n/g, '<br/>')
      // Convert paragraph tags
      .replace(/<p>/gi, '<br/><br/>')
      .replace(/<\/p>/gi, '')
      // Convert bold tags
      .replace(/<strong>(.*?)<\/strong>/gi, '<strong>$1</strong>')
      .replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>')
      // Convert italic tags
      .replace(/<em>(.*?)<\/em>/gi, '<em>$1</em>')
      .replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>')
      // Convert lists
      .replace(/<ul>/gi, '<ul style="margin-left: 20px; margin-bottom: 10px;">')
      .replace(/<ol>/gi, '<ol style="margin-left: 20px; margin-bottom: 10px;">')
      .replace(/<li>/gi, '<li style="margin-bottom: 5px;">')
      // Remove any other HTML tags we don't want to render
      .replace(/<[^>]*>/g, (match) => {
        const allowedTags = ['br', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre'];
        const tagName = match.match(/<\/?([^\s>]+)/)?.[1]?.toLowerCase();
        return allowedTags.includes(tagName) ? match : '';
      });

    return { __html: htmlText.trim() };
  };

  return (
    <div className={`message ${message.sender} ${message.isError ? 'error' : ''}`}>
      <div className="message-header">
        <div className="message-sender">
          {message.sender === 'user' ? (
            <User className="message-icon user-icon" />
          ) : (
            <Bot className="message-icon bot-icon" />
          )}
          <span className="sender-name">
            {message.sender === 'user' ? 'You' : 'PDF Assistant'}
          </span>
        </div>
        <span className="message-time">{message.timestamp}</span>
      </div>
      <div 
        className="message-content"
        dangerouslySetInnerHTML={renderMessageText(message.text)}
      />
    </div>
  );
};

export default ChatMessage;