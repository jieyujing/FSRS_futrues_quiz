import React from 'react';
import { Trophy, Clock, Target, Rocket, ArrowRight, Home } from 'lucide-react';

interface SummaryData {
  accuracy: number;
  correct_count: number;
  total_count: number;
  total_time_spent: number;
  mastery_delta: {
    newly_mastered: number;
    moved_to_learning: number;
    total_learned: number;
  };
}

interface PracticeSummaryProps {
  data: SummaryData;
  onContinue: () => void;
  onExit: () => void;
}

const PracticeSummary: React.FC<PracticeSummaryProps> = ({ data, onContinue, onExit }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-green-500';
    if (acc >= 70) return 'text-blue-500';
    if (acc >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getGreeting = (acc: number) => {
    if (acc >= 90) return '手感火热，继续保持！';
    if (acc >= 70) return '表现不错，再接再厉！';
    return '继续加油，积少成多！';
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] px-8 py-10 text-center text-white">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
          <Trophy className="w-8 h-8 text-yellow-300" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{getGreeting(data.accuracy)}</h2>
        <p className="text-white/70">本次练习已完成 {data.total_count} 道题目</p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* 正确率 */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">准确率</span>
            </div>
            <div className={`text-3xl font-bold ${getAccuracyColor(data.accuracy)}`}>
              {data.accuracy}%
              <span className="text-sm text-gray-400 font-normal ml-2">
                ({data.correct_count}/{data.total_count})
              </span>
            </div>
          </div>

          {/* 总耗时 */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">累计用时</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {formatTime(data.total_time_spent)}
            </div>
          </div>
        </div>

        {/* FSRS 记忆进度 */}
        <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 mb-8">
          <h3 className="flex items-center gap-2 font-bold text-blue-900 mb-4">
            <Rocket className="w-5 h-5" />
            记忆进度追踪
          </h3>
          <div className="flex justify-between items-center bg-white px-5 py-3 rounded-lg border border-blue-100 mb-3">
            <span className="text-gray-600">新增熟练掌握 (稳定性 ≥ 15d)</span>
            <span className="font-bold text-green-600">+{data.mastery_delta.newly_mastered}</span>
          </div>
          <div className="flex justify-between items-center bg-white px-5 py-3 rounded-lg border border-blue-100">
            <span className="text-gray-600">新题转入学习中</span>
            <span className="font-bold text-blue-600">+{data.mastery_delta.moved_to_learning}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onContinue}
            className="w-full py-4 bg-[#0F172A] hover:bg-[#1E3A8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
          >
            继续学习
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onExit}
            className="w-full py-4 bg-white hover:bg-gray-50 text-gray-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-all border border-gray-200"
          >
            结束练习
            <Home className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PracticeSummary;
