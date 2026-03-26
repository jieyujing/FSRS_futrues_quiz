import React, { useState } from 'react';

interface Option {
  [key: string]: string;
}

interface QuestionCardProps {
  id: number;
  questionType: string;
  content: string;
  options?: Option;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  questionType,
  content,
  options,
  onAnswer,
  disabled = false,
}) => {
  const [selected, setSelected] = useState<string>('');

  const handleSelect = (key: string) => {
    if (disabled) return;
    setSelected(key);
  };

  const handleSubmit = () => {
    if (selected) {
      onAnswer(selected);
    }
  };

  const renderOptions = () => {
    if (questionType === '判断') {
      return (
        <div className="space-y-3">
          {['正确', '错误'].map((opt) => (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={disabled}
              className={`w-full p-4 text-left rounded-lg border transition-all ${
                selected === opt
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {options &&
          Object.entries(options).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={disabled}
              className={`w-full p-4 text-left rounded-lg border transition-all ${
                selected === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <span className="font-medium mr-2">{key}.</span>
              {value}
            </button>
          ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
          {questionType}
        </span>
      </div>

      <div className="mb-6 text-gray-800 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>

      {renderOptions()}

      <button
        onClick={handleSubmit}
        disabled={!selected || disabled}
        className={`mt-6 w-full py-3 rounded-lg font-medium transition-all ${
          selected && !disabled
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        提交答案
      </button>
    </div>
  );
};

export default QuestionCard;