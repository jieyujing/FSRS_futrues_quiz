import React from 'react';
import { CheckCircle, XCircle, ArrowRight, Sparkles, BookOpen } from 'lucide-react';

interface AnswerResultProps {
  question: {
    id: number;
    questionType: string;
    content: string;
    options?: { [key: string]: string };
  };
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  onRate: (rating: number) => void;
  onNext: () => void;
}

const AnswerResult: React.FC<AnswerResultProps> = ({
  question,
  userAnswer,
  isCorrect,
  correctAnswer,
  explanation,
  onRate,
  onNext,
}) => {
  const optionEntries = question.options ? Object.entries(question.options) : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 animate-fade-in-up">
      {/* 结果头部 */}
      <div
        className={`flex items-center gap-4 p-5 rounded-xl mb-6 ${
          isCorrect ? 'bg-emerald-50' : 'bg-red-50'
        }`}
      >
        <div
          className={`p-2 rounded-xl ${isCorrect ? 'bg-emerald-100' : 'bg-red-100'}`}
        >
          {isCorrect ? (
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600" />
          )}
        </div>
        <div>
          <span
            className={`text-lg font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}
          >
            {isCorrect ? '回答正确' : '回答错误'}
          </span>
          <p className={`text-sm mt-0.5 ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
            {isCorrect ? '继续保持，你做得很棒！' : '别灰心，再接再厉！'}
          </p>
        </div>
      </div>

      {/* 题目内容 */}
      <div className="mb-6 p-5 bg-gradient-to-br from-[#0F172A]/5 to-[#1E3A8A]/5 rounded-xl border border-[#1E3A8A]/10">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-[#1E3A8A]" />
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            {question.questionType}
          </label>
        </div>
        <p className="text-[#0F172A] font-medium leading-relaxed text-base">
          {question.content}
        </p>
      </div>

      {/* 选项 */}
      {optionEntries.length > 0 && (
        <div className="mb-6">
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3 block">
            选项
          </label>
          <div className="space-y-2">
            {optionEntries.map(([key, value]) => {
              const isSelected = userAnswer.toUpperCase() === key.toUpperCase();
              const isCorrectOption = correctAnswer.toUpperCase() === key.toUpperCase();
              
              let bgColor = 'bg-white border-gray-200';
              let textColor = 'text-[#334155]';
              
              if (isCorrectOption) {
                bgColor = 'bg-emerald-50 border-emerald-500';
                textColor = 'text-emerald-700';
              } else if (isSelected && !isCorrect) {
                bgColor = 'bg-red-50 border-red-500';
                textColor = 'text-red-700';
              }
              
              return (
                <div
                  key={key}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${bgColor}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold ${
                      isCorrectOption 
                        ? 'bg-emerald-500 text-white' 
                        : isSelected 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {key}
                    </span>
                    <span className={`text-sm ${textColor}`}>{value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 用户答案和正确答案 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2 block">
            你的答案
          </label>
          <span className={`text-2xl font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
            {userAnswer}
          </span>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2 block">
            正确答案
          </label>
          <span className="text-2xl font-bold text-emerald-700">{correctAnswer}</span>
        </div>
      </div>

      {/* 解析 */}
      {explanation && (
        <div className="mb-8">
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3 block">
            解析详情
          </label>
          <div className="text-[#334155] whitespace-pre-wrap leading-relaxed bg-gray-50 border border-gray-100 p-5 rounded-xl text-base">
            {explanation}
          </div>
        </div>
      )}

      {/* FSRS 评分 */}
      <div className="mb-8 p-5 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#CA8A04]" />
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            掌握程度评估
          </label>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: '重来', level: 1, bg: 'bg-red-500 hover:bg-red-600', desc: '完全不记得' },
            { label: '困难', level: 2, bg: 'bg-orange-500 hover:bg-orange-600', desc: '有些印象' },
            { label: '良好', level: 3, bg: 'bg-emerald-500 hover:bg-emerald-600', desc: '基本掌握' },
            { label: '简单', level: 4, bg: 'bg-[#0F172A] hover:bg-[#1E3A8A]', desc: '完全掌握' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onRate(item.level)}
              className={`py-3 px-2 ${item.bg} text-white rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col items-center gap-1`}
            >
              <span>{item.label}</span>
              <span className="text-xs opacity-75 hidden sm:block">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 下一题按钮 */}
      <button
        onClick={onNext}
        className="w-full py-4 bg-[#CA8A04] text-white rounded-xl font-bold text-lg hover:bg-[#A16207] transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
      >
        继续下一题
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default AnswerResult;
