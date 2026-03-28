import React, { useState } from 'react';
import { Layers, Tag, ChevronRight, Eye } from 'lucide-react';

interface FlashcardProps {
  id: number;
  cardType: string;
  frontContent: string;
  backContent: string;
  tags?: string[];
  difficulty?: string;
  onRate: (rating: number) => void;
  disabled?: boolean;
}

const Flashcard: React.FC<FlashcardProps> = ({
  cardType,
  frontContent,
  backContent,
  tags,
  difficulty,
  onRate,
  disabled = false,
}) => {
  const [showBack, setShowBack] = useState(false);

  const ratings = [
    { label: '重来', value: 1, color: 'bg-rose-500 hover:bg-rose-600' },
    { label: '困难', value: 2, color: 'bg-orange-500 hover:bg-orange-600' },
    { label: '良好', value: 3, color: 'bg-blue-500 hover:bg-blue-600' },
    { label: '简单', value: 4, color: 'bg-emerald-500 hover:bg-emerald-600' },
  ];

  const typeColors: { [key: string]: string } = {
    'Concept': 'bg-blue-100 text-blue-700 border-blue-200',
    'Rule': 'bg-amber-100 text-amber-700 border-amber-200',
    'Error': 'bg-rose-100 text-rose-700 border-rose-200',
  };

  const difficultyColors: { [key: string]: string } = {
    'Easy': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Medium': 'bg-blue-50 text-blue-600 border-blue-100',
    'Hard': 'bg-rose-50 text-rose-600 border-rose-100',
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className={`bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-500 transform ${showBack ? 'rotate-y-180' : ''}`}>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0F172A] rounded-xl">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${typeColors[cardType] || 'bg-gray-100'}`}>
                {cardType}
              </span>
            </div>
            {difficulty && (
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${difficultyColors[difficulty]}`}>
                {difficulty}
              </span>
            )}
          </div>

          {/* Front Content */}
          <div className="mb-12">
            <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-4">正面 / 提示</h3>
            <div className="text-2xl font-bold text-[#0F172A] leading-tight whitespace-pre-wrap">
              {frontContent}
            </div>
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-xs font-bold border border-gray-100">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Area */}
          {!showBack ? (
            <button
              onClick={() => setShowBack(true)}
              className="w-full py-6 bg-[#CA8A04] hover:bg-[#A16207] text-white rounded-2xl font-black text-xl shadow-lg shadow-yellow-200 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Eye className="w-6 h-6" />
              查看答案
            </button>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <hr className="border-gray-100 mb-8" />
              <div className="mb-12">
                <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-4">背面 / 答案</h3>
                <div className="text-xl text-[#334155] leading-relaxed whitespace-pre-wrap font-medium bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  {backContent}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ratings.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => onRate(r.value)}
                    disabled={disabled}
                    className={`py-4 px-2 rounded-xl text-white font-black text-sm transition-all active:scale-95 flex flex-col items-center gap-1 shadow-md ${r.color} ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  >
                    <span>{r.label}</span>
                    <span className="text-[10px] opacity-70">FSRS {r.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 flex justify-center">
        <p className="text-gray-400 text-sm font-medium">
          {showBack ? '根据记忆效果评分，系统将自动安排下次复习' : '先尝试在脑中回忆答案，然后查看'}
        </p>
      </div>
    </div>
  );
};

export default Flashcard;