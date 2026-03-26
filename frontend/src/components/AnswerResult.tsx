import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface AnswerResultProps {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  onRate: (rating: number) => void;
  onNext: () => void;
}

const AnswerResult: React.FC<AnswerResultProps> = ({
  isCorrect,
  correctAnswer,
  explanation,
  onRate,
  onNext,
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 结果头部 */}
      <div className={`flex items-center gap-3 mb-6 p-4 rounded-2xl ${
        isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}>
        {isCorrect ? (
          <>
            <CheckCircle className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight">回答正确 !</span>
          </>
        ) : (
          <>
            <XCircle className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight">回答错误</span>
          </>
        )}
      </div>

      {/* 正确答案 */}
      <div className="mb-6 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">正确答案</label>
        <span className="text-2xl font-black text-gray-900">{correctAnswer}</span>
      </div>

      {/* 解析 */}
      {explanation && (
        <div className="mb-8">
          <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">解析详情</label>
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-lg">
            {explanation}
          </div>
        </div>
      )}

      {/* FSRS评分 */}
      <div className="mb-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
        <label className="text-xs font-bold text-gray-400 uppercase mb-4 block text-center">掌握程度评估</label>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Again', level: 1, color: 'bg-red-500 hover:bg-red-600' },
            { label: 'Hard', level: 2, color: 'bg-orange-500 hover:bg-orange-600' },
            { label: 'Good', level: 3, color: 'bg-green-500 hover:bg-green-600' },
            { label: 'Easy', level: 4, color: 'bg-blue-500 hover:bg-blue-600' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onRate(item.level)}
              className={`py-3 px-2 ${item.color} text-white rounded-xl text-sm font-bold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 下一题按钮 */}
      <button
        onClick={onNext}
        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
      >
        继续下一题
      </button>
    </div>
  );
};

export default AnswerResult;