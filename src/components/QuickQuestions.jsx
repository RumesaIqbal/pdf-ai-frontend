import React from 'react';

const QuickQuestions = ({ questions, onQuestionClick }) => {
  return (
    <div className="quick-questions">
      {questions.map((question, index) => (
        <button
          key={index}
          className="quick-question-btn"
          onClick={() => onQuestionClick(question)}
        >
          {question}
        </button>
      ))}
    </div>
  );
};

export default QuickQuestions;