import React, { useState } from 'react';
import { FileQuestion, AlertCircle } from 'lucide-react';
import { isMultiChoice } from '../utils/questionType';

interface Option {
  [key: string]: string;
}

interface QuestionCardProps {
  id: number;
  questionType: string;
  content: string;
  options?: Option;
  mistakeCount?: number;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  questionType,
  content,
  options,
  mistakeCount = 0,
  onAnswer,
  disabled = false,
}) => {
  const [selected, setSelected] = useState<string>('');

  const isMulti = isMultiChoice(questionType);

  const handleSelect = (key: string) => {
    if (disabled) return;
    
    if (isMulti) {
      // 多选逻辑
      const current = selected.split('').filter(s => s);
      const index = current.indexOf(key);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(key);
      }
      setSelected(current.sort().join(''));
    } else {
      // 单选逻辑
      setSelected(key);
    }
  };

  const handleSubmit = () => {
    if (selected) {
      onAnswer(selected);
    }
  };

  const renderOptions = () => {
    return (
      <div className="space-y-3">
        {options &&
          Object.entries(options).map(([key, value]) => {
            const isSelected = isMulti ? selected.includes(key) : selected === key;
            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                disabled={disabled}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 group cursor-pointer flex items-start gap-4 ${
                  isSelected
                    ? 'border-[#0F172A] bg-[#0F172A]/5 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-[#1E3A8A]/30 hover:bg-gray-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-gray-100 text-[#64748B] group-hover:bg-[#1E3A8A]/10 group-hover:text-[#1E3A8A]'
                  }`}
                >
                  {key}
                </div>
                <div
                  className={`text-base leading-relaxed pt-1 ${
                    isSelected ? 'text-[#0F172A] font-medium' : 'text-[#334155]'
                  }`}
                >
                  {value}
                </div>
              </button>
            );
          })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      {/* 题目类型标签 */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-[#0F172A] rounded-lg">
          <FileQuestion className="w-4 h-4 text-white" />
        </div>
        <span className="px-3 py-1.5 bg-gray-100 text-[#0F172A] rounded-full text-sm font-medium">
          {questionType}
        </span>
        {mistakeCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-sm font-bold border border-rose-100 animate-pulse">
            <AlertCircle className="w-4 h-4" />
            已错 {mistakeCount} 次
          </span>
        )}
      </div>

      {/* 题目内容 */}
      <div className="mb-8 text-[#0F172A] leading-relaxed whitespace-pre-wrap text-lg font-medium">
        {content}
      </div>

      {/* 选项 */}
      {renderOptions()}

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={!selected || disabled}
        className={`mt-8 w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 cursor-pointer ${
          selected && !disabled
            ? 'bg-[#CA8A04] text-white hover:bg-[#A16207] shadow-md hover:shadow-lg hover:-translate-y-0.5'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        提交答案
      </button>
    </div>
  );
};

export default QuestionCard;