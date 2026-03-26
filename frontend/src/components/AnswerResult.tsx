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
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 结果头部 */}
      <div className={`flex items-center gap-2 mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
        {isCorrect ? (
          <>
            <CheckCircle className="w-6 h-6" />
            <span className="text-lg font-medium">正确!</span>
          </>
        ) : (
          <>
            <XCircle className="w-6 h-6" />
            <span className="text-lg font-medium">错误</span>
          </>
        )}
      </div>

      {/* 正确答案 */}
      <div className="mb-4">
        <span className="text-gray-600">正确答案：</span>
        <span className="font-medium text-gray-900">{correctAnswer}</span>
      </div>

      {/* 解析 */}
      {explanation && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-2">解析</div>
          <div className="text-gray-700 whitespace-pre-wrap">{explanation}</div>
        </div>
      )}

      {/* FSRS评分 */}
      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-3">这道题你觉得怎么样？</div>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onRate(1)}
            className="py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Again
          </button>
          <button
            onClick={() => onRate(2)}
            className="py-2 px-4 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
          >
            Hard
          </button>
          <button
            onClick={() => onRate(3)}
            className="py-2 px-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            Good
          </button>
          <button
            onClick={() => onRate(4)}
            className="py-2 px-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Easy
          </button>
        </div>
      </div>

      {/* 下一题按钮 */}
      <button
        onClick={onNext}
        className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
      >
        下一题
      </button>
    </div>
  );
};

export default AnswerResult;