import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, User, Bot, Sparkles, RefreshCw, Plus, Trash2, MessageSquare, Upload, FileText, X, AlertCircle, Menu, X as CloseIcon } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import QuickQuestions from './components/QuickQuestions';
import TypingIndicator from './components/TypingIndicator';
import './styles/App.css';

function App() {
  const [chats, setChats] = useState([
    { id: 1, name: 'Chat 01', messages: [], isActive: true, sessionId: null }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [pdfInfo, setPdfInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const MATCH_COUNT = 2;

  const activeChat = chats.find(chat => chat.isActive);
  const activeMessages = activeChat ? activeChat.messages : [];
  const hasUploadedPDF = activeChat?.sessionId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages]);

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileSidebar(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Function to clean HTML response
  const cleanHtmlResponse = (text) => {
    if (!text) return '';
    
    const cleanedText = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<link\b[^<]*(?:(?!>)<[^<]*)*>/gi, '')
      .replace(/<meta\b[^<]*(?:(?!>)<[^<]*)*>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '');
    
    return cleanedText;
  };

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showError('Please upload a PDF file only.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        showError('File size should be less than 50MB.');
        return;
      }
      setUploadedFile(file);
    }
  };

  const uploadPDF = async (isUpdate = false) => {
    if (!uploadedFile) {
      showError('Please select a PDF file first.');
      return;
    }
  
    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);
  
    const formData = new FormData();
    formData.append('file', uploadedFile);
  
    try {
      // If updating, end the previous session first
      let sessionIdToUse = activeChat.sessionId;
      if (isUpdate && sessionIdToUse) {
        try {
          await axios.post(`${API_BASE_URL}/end_session`, {
            session_id: sessionIdToUse
          });
          console.log('Previous session ended successfully');
        } catch (err) {
          console.error('Failed to end previous session:', err);
        }
      }
  
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);
  
      // Append session_id to reuse if updating
      if (isUpdate && activeChat.sessionId) {
        formData.append('session_id', activeChat.sessionId);
      }
  
      const response = await axios.post(`${API_BASE_URL}/upload_pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadProgress(percentCompleted);
        },
      });
  
      clearInterval(progressInterval);
      setUploadProgress(100);
  
      const { session_id, message, filename } = response.data;
  
      // Update active chat with the new session ID
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === activeChat.id
            ? { ...chat, sessionId: session_id }
            : chat
        )
      );
  
      // Update PDF info
      setPdfInfo({
        name: filename || uploadedFile.name,
        size: (uploadedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        uploadedAt: new Date().toLocaleString(),
        isUpdate: isUpdate
      });
  
      // Add system message
      const systemMessage = {
        id: Date.now(),
        text: isUpdate 
          ? `✅ PDF updated successfully: "${filename || uploadedFile.name}". You can now ask questions about the updated content.`
          : `✅ PDF uploaded successfully: "${filename || uploadedFile.name}". You can now ask questions about this document.`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      };
  
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === activeChat.id
            ? { ...chat, messages: [...chat.messages, systemMessage] }
            : chat
        )
      );
  
      // Reset file input and modal
      setUploadedFile(null);
      setFileInputKey(Date.now());
      if (isUpdate) setShowUpdateModal(false);
      else setShowUploadModal(false);
  
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);
  
    } catch (error) {
      console.error('Upload error:', error);
      let errorMsg = 'Failed to upload PDF. ';
      if (error.response) errorMsg += error.response.data?.detail || error.response.statusText;
      else if (error.request) errorMsg += 'No response from server. Please check your connection.';
      else errorMsg += error.message;
  
      showError(errorMsg);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !activeChat) return;

    // Check if PDF is uploaded
    if (!activeChat.sessionId) {
      const systemMessage = {
        id: Date.now(),
        text: 'Please upload a PDF first to start asking questions.',
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      };

      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === activeChat.id 
            ? { ...chat, messages: [...chat.messages, systemMessage] }
            : chat
        )
      );
      setShowUploadModal(true);
      return;
    }

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedChats = chats.map(chat => 
      chat.id === activeChat.id 
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    );
    setChats(updatedChats);
    setInput('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/ask`, {
        question: input,
        session_id: activeChat.sessionId,
        match_count: MATCH_COUNT,
      });

      // Clean the HTML response before storing
      const cleanedAnswer = cleanHtmlResponse(response.data.answer);

      const botMessage = {
        id: Date.now() + 1,
        text: cleanedAnswer,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChats(updatedChats.map(chat => 
        chat.id === activeChat.id 
          ? { ...chat, messages: [...chat.messages, botMessage] }
          : chat
      ));
    } catch (error) {
      console.error('Error:', error);
      
      let errorMsg = 'Sorry, I encountered an error. ';
      if (error.response) {
        errorMsg += error.response.data?.detail || error.response.statusText;
      } else if (error.request) {
        errorMsg = 'Unable to connect to server. Please check your connection.';
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        text: errorMsg,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      
      setChats(updatedChats.map(chat => 
        chat.id === activeChat.id 
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const createNewChat = () => {
    const newChatId = Math.max(...chats.map(c => c.id), 0) + 1;
    const newChat = {
      id: newChatId,
      name: `Chat ${String(newChatId).padStart(2, '0')}`,
      messages: [],
      isActive: true,
      sessionId: null
    };
    
    setChats(prevChats => 
      prevChats.map(chat => ({ ...chat, isActive: false }))
        .concat(newChat)
    );
    setPdfInfo(null);
    setShowUploadModal(true);
  };

  const switchChat = (chatId) => {
    const chatToSwitch = chats.find(chat => chat.id === chatId);
    setChats(prevChats => 
      prevChats.map(chat => ({
        ...chat,
        isActive: chat.id === chatId
      }))
    );
    setInput('');
    setErrorMessage(null);
    
    // Update PDF info for active chat
    if (chatToSwitch.sessionId) {
      setPdfInfo({
        name: 'Uploaded PDF',
        uploadedAt: 'Previous session'
      });
    } else {
      setPdfInfo(null);
    }
    
    // Close mobile sidebar after selecting chat
    setShowMobileSidebar(false);
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (chats.length <= 1) return;
    
    const chatToDelete = chats.find(chat => chat.id === chatId);
    
    // End session on backend if chat has a session
    if (chatToDelete.sessionId) {
      try {
        await axios.post(`${API_BASE_URL}/end_session`, {
          session_id: chatToDelete.sessionId
        });
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }
    
    const newChats = chats.filter(chat => chat.id !== chatId);
    const wasActive = chatToDelete?.isActive;
    
    if (wasActive && newChats.length > 0) {
      newChats[0].isActive = true;
    }
    
    setChats(newChats);
    setErrorMessage(null);
  };

  const clearActiveChat = () => {
    if (!activeChat) return;
    
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === activeChat.id 
          ? { ...chat, messages: [] }
          : chat
      )
    );
    setErrorMessage(null);
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
  };

  const quickQuestions = [
    "What is this document about?",
    "Summarize the main points",
    "What are the key findings?",
  ];

  return (
    <div className="app-container">
      {/* Error Message */}
      {errorMessage && (
        <div className="error-toast">
          <AlertCircle className="error-icon" />
          <span className="error-text">{errorMessage}</span>
          <button className="error-close" onClick={() => setErrorMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Upload PDF Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📄 Upload PDF</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div 
                className={`upload-area ${isUploading ? 'disabled' : ''}`} 
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <Upload className="upload-icon" size={48} />
                <h3>Click to select PDF</h3>
                <p>Or drag and drop your PDF here</p>
                <p className="upload-note">Maximum file size: 50MB</p>
              </div>
              
              <input
                key={fileInputKey}
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
              
              {uploadedFile && (
                <div className="file-preview">
                  <FileText className="file-icon" />
                  <div className="file-info">
                    <span className="file-name">{uploadedFile.name}</span>
                    <span className="file-size">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  {!isUploading && (
                    <button 
                      className="remove-file-btn"
                      onClick={() => setUploadedFile(null)}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}
              
              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="progress-text">{uploadProgress}%</span>
                  <p className="upload-note">Processing PDF, please wait...</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn secondary"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                className="modal-btn primary"
                onClick={() => uploadPDF(false)}
                disabled={!uploadedFile || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update PDF Modal */}
      {showUpdateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>🔄 Update PDF</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowUpdateModal(false)}
                disabled={isUploading}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="update-notice">
                Upload a new PDF to update the current document. 
                This will replace the existing content for this chat session.
              </p>
              
              <div 
                className={`upload-area ${isUploading ? 'disabled' : ''}`} 
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <Upload className="upload-icon" size={48} />
                <h3>Select new PDF</h3>
                <p>Replace current document with a new one</p>
                <p className="upload-note">Maximum file size: 50MB</p>
              </div>
              
              <input
                key={fileInputKey}
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
              
              {uploadedFile && (
                <div className="file-preview">
                  <FileText className="file-icon" />
                  <div className="file-info">
                    <span className="file-name">{uploadedFile.name}</span>
                    <span className="file-size">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  {!isUploading && (
                    <button 
                      className="remove-file-btn"
                      onClick={() => setUploadedFile(null)}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}
              
              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="progress-text">{uploadProgress}%</span>
                  <p className="upload-note">Processing PDF, please wait...</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn secondary"
                onClick={() => setShowUpdateModal(false)}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                className="modal-btn primary"
                onClick={() => uploadPDF(true)}
                disabled={!uploadedFile || isUploading}
              >
                {isUploading ? 'Updating...' : 'Update PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-content">
          <div className="logo">
            {/* Mobile Menu Button */}
            <button 
              className="mobile-menu-btn"
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              aria-label={showMobileSidebar ? "Close menu" : "Open menu"}
            >
              {showMobileSidebar ? <CloseIcon size={20} /> : <Menu size={20} />}
            </button>
            <Sparkles className="logo-icon" />
            <div className="logo-text">
              <h1>PDF AI Assistant</h1>
              {pdfInfo && (
                <div className="pdf-info">
                  <FileText size={14} />
                  <span className="pdf-name" title={pdfInfo.name}>
                    {pdfInfo.name}
                  </span>
                  {pdfInfo.isUpdate && (
                    <span className="update-badge">Updated</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="header-controls">
            {hasUploadedPDF && (
              <button 
                onClick={() => setShowUpdateModal(true)} 
                className="update-pdf-btn"
                aria-label="Update PDF"
              >
                <Upload className="icon-sm" />
                <span className="btn-text">Update PDF</span>
              </button>
            )}
            <button onClick={createNewChat} className="new-chat-btn" aria-label="New chat">
              <Plus className="icon-sm" />
              <span className="btn-text">New Chat</span>
            </button>
            <button onClick={clearActiveChat} className="clear-btn" aria-label="Clear chat">
              <RefreshCw className="icon-sm" />
              <span className="btn-text">Clear Chat</span>
            </button>
          </div>
        </div>
      </header>

      <div className="chat-container">
        {/* Sidebar with Multiple Chats */}
        <aside className={`sidebar ${showMobileSidebar ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <MessageSquare className="sidebar-icon" />
            <h3>Chat Sessions</h3>
            {/* Mobile close button */}
         
          </div>
          
          <div className="chats-list">
            {chats.map(chat => (
              <div 
                key={chat.id}
                className={`chat-item ${chat.isActive ? 'active' : ''}`}
                onClick={() => switchChat(chat.id)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && switchChat(chat.id)}
                aria-label={`Switch to ${chat.name}`}
              >
                <div className="chat-item-content">
                  <div className="chat-header">
                    <span className="chat-name">{chat.name}</span>
                    {chat.sessionId && (
                      <FileText size={12} className="pdf-indicator" aria-label="PDF loaded" />
                    )}
                  </div>
                  <span className="chat-message-count">
                    {chat.messages.filter(m => m.sender !== 'system').length} messages
                    {chat.sessionId && ' • PDF loaded'}
                  </span>
                </div>
                {chats.length > 1 && (
                  <button 
                    className="delete-chat-btn"
                    onClick={(e) => deleteChat(chat.id, e)}
                    title="Delete chat"
                    aria-label={`Delete ${chat.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="sidebar-section">
            <h3>📚 Quick Questions</h3>
            <div className="quick-questions">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  className="quick-question-btn"
                  onClick={() => {
                    handleQuickQuestion(question);
                    setShowMobileSidebar(false);
                  }}
                  aria-label={`Ask: ${question}`}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>💡 Tips</h3>
            <ul className="tips-list">
              <li>Upload a PDF to start asking questions</li>
              <li>You can update the PDF anytime</li>
              <li>Create separate chats for different topics</li>
              <li>The AI understands natural conversation</li>
            </ul>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className={`main-chat ${showMobileSidebar ? 'sidebar-open' : ''}`}>
          <div className="messages-container">
            {activeMessages.length === 0 ? (
              <div className="welcome-message">
                <div className="welcome-content">
                  <Sparkles className="welcome-icon" />
                  <h2>Welcome to PDF AI Assistant! 📄</h2>
                  {!hasUploadedPDF ? (
                    <>
                      <p>Upload a PDF document to start asking questions</p>
                      <div className="quick-actions">
                        <button 
                          className="quick-action-btn primary"
                          onClick={() => setShowUploadModal(true)}
                          aria-label="Upload PDF"
                        >
                          <Upload size={16} /> Upload PDF
                        </button>
                        <button 
                          className="quick-action-btn"
                          onClick={createNewChat}
                          aria-label="Start new chat"
                        >
                          <Plus size={16} /> New Chat
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>Ask questions about your uploaded PDF document</p>
                      <p className="subtext">
                        PDF: {pdfInfo?.name} • {pdfInfo?.size}
                      </p>
                      <div className="quick-actions">
                        <button 
                          className="quick-action-btn"
                          onClick={() => setShowUpdateModal(true)}
                          aria-label="Update PDF"
                        >
                          <Upload size={16} /> Update PDF
                        </button>
                        <button 
                          className="quick-action-btn"
                          onClick={createNewChat}
                          aria-label="Start new chat"
                        >
                          <Plus size={16} /> New Chat
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              activeMessages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))
            )}
            
            {isLoading && (
              <div className="message bot">
                <div className="message-header">
                  <Bot className="message-icon bot-icon" />
                  <span className="sender-name">PDF Assistant</span>
                </div>
                <div className="message-content">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <div className="input-wrapper">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasUploadedPDF ? "Ask questions about your PDF..." : "Upload a PDF first to ask questions..."}
                className="message-input"
                rows="2"
                disabled={isLoading || !hasUploadedPDF}
                aria-label="Type your message"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || !hasUploadedPDF}
                className="send-button"
                title={!hasUploadedPDF ? "Upload a PDF first" : "Send message"}
                aria-label="Send message"
              >
                <Send className="send-icon" />
              </button>
            </div>
            <div className="input-hint">
              Press <kbd>Enter</kbd> to send • <kbd>Shift + Enter</kbd> for new line
              {!hasUploadedPDF && (
                <span className="upload-hint">
                  • <button 
                    className="hint-link"
                    onClick={() => setShowUploadModal(true)}
                    aria-label="Upload PDF"
                  >
                    Upload a PDF
                  </button> to start asking questions
                </span>
              )}
            </div>
          </div>
        </main>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-logo">PDF AI Assistant</span>
            <span className="footer-separator">•</span>
            <span className="footer-version">v1.0.0</span>
          </div>
          <div className="footer-center">
            <span>Powered by </span>
            <span className="tech-badge">Gemini AI</span>
            <span className="footer-separator">•</span>
            <span className="tech-badge">Supabase</span>
            <span className="footer-separator">•</span>
            <span className="tech-badge">FastAPI</span>
          </div>
          <div className="footer-right">
            <span>© {new Date().getFullYear()} All rights reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
