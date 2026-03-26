import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { practiceApi } from '../services/api';
import { BookOpen, CheckCircle, Clock, Target, TrendingUp, ChevronRight, Play, Brain, Award, BarChart3, Flame, AlertCircle } from 'lucide-react';

interface DashboardStats {
  total_questions: number;
  learned: number;
  due_today: number;
  accuracy_rate: number;
  subjects: Array<{
    name: string;
    total: number;
    learned: number;
    progress: number;
  }>;
  fsrs_stats: {
    mastery_distribution: {
      mastered: number;
      proficient: number;
      learning: number;
      review_needed: number;
    };
    average_retrievability: number;
    average_stability: number;
    average_difficulty: number;
    total_reviews: number;
    total_mistakes: number;
    rating_distribution: {
      again: number;
      hard: number;
      good: number;
      easy: number;
    };
    total_learned: number;
  };
}

const Home: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('全部');

  useEffect(() => {
    loadStats();
    const saved = localStorage.getItem('f_practice_default_subject');
    if (saved) {
      setSelectedSubject(saved);
    }
  }, []);

  const loadStats = async () => {
    try {
      const response = await practiceApi.dashboard();
      setStats(response.data);
      // If selectedSubject is '全部' and we have subjects, maybe keep it '全部'
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject);
    if (subject !== '全部') {
      localStorage.setItem('f_practice_default_subject', subject);
    } else {
      localStorage.removeItem('f_practice_default_subject');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-[#64748B]">
          <div className="w-5 h-5 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
          <span className="font-medium">加载中...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#64748B] italic">正在读取题库数据...</div>
      </div>
    );
  }

  const masteryData = [
    { label: '熟练掌握', value: stats?.fsrs_stats?.mastery_distribution?.mastered || 0, color: 'bg-emerald-500', desc: '稳定性 ≥ 15d' },
    { label: '基本掌握', value: stats?.fsrs_stats?.mastery_distribution?.proficient || 0, color: 'bg-blue-500', desc: '稳定性 ≥ 5d' },
    { label: '需要复习', value: stats?.fsrs_stats?.mastery_distribution?.learning || 0, color: 'bg-amber-500', desc: '稳定性 < 5d' },
    { label: '急需复习', value: stats?.fsrs_stats?.mastery_distribution?.review_needed || 0, color: 'bg-red-500', desc: '遗忘风险高' },
  ];

  const totalMastery = masteryData.reduce((sum, item) => sum + (item.value || 0), 0) || 1;

  const subjects = ['全部', ...(stats?.subjects?.map(s => s.name) || [])];

  return (
    <div className="space-y-8">
      {/* 标题区域 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">期货刷题助手</h1>
          <p className="text-[#64748B] mt-1">基于 FSRS 算法的高效备考系统</p>
          
          {/* 科目切换器 */}
          <div className="flex flex-wrap gap-2 mt-4">
            {subjects.map(s => {
              const subInfo = stats?.subjects?.find(sub => sub.name === s);
              return (
                <button
                  key={s}
                  onClick={() => handleSubjectChange(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedSubject === s
                      ? 'bg-[#0F172A] text-white shadow-md'
                      : 'bg-white text-[#64748B] border border-gray-200 hover:border-[#0F172A] hover:text-[#0F172A]'
                  }`}
                >
                  {s} {subInfo ? `(${subInfo.total})` : s === '全部' ? `(${stats.total_questions})` : ''}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/practice"
            state={{ subject: selectedSubject === '全部' ? undefined : selectedSubject, mode: 'mistake' }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-rose-500 border-2 border-rose-100 rounded-xl font-bold hover:bg-rose-50 hover:border-rose-200 transition-all duration-200 shadow-sm"
          >
            <AlertCircle className="w-5 h-5" />
            错题复习
          </Link>
          <Link
            to="/practice"
            state={{ subject: selectedSubject === '全部' ? undefined : selectedSubject }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-[#1E3A8A] transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
          >
            <Play className="w-5 h-5 fill-current" />
            开始刷题
          </Link>
        </div>
      </div>

      {/* 基础统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group cursor-default">
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-blue-50 rounded-xl group-hover:scale-105 transition-transform duration-200">
              <BookOpen className="w-5 h-5 text-[#1E3A8A]" />
            </div>
            <TrendingUp className="w-4 h-4 text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-[#64748B] uppercase tracking-wide">总题数</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{stats?.total_questions?.toLocaleString() || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group cursor-default">
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-emerald-50 rounded-xl group-hover:scale-105 transition-transform duration-200">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-[#64748B] uppercase tracking-wide">已学习</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{stats?.learned?.toLocaleString() || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group cursor-default">
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-amber-50 rounded-xl group-hover:scale-105 transition-transform duration-200">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-[#64748B] uppercase tracking-wide">今日待复习</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{stats?.due_today || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group cursor-default">
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-purple-50 rounded-xl group-hover:scale-105 transition-transform duration-200">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-[#64748B] uppercase tracking-wide">正确率</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{stats?.accuracy_rate || 0}%</div>
          </div>
        </div>
      </div>

      {/* FSRS 掌握程度统计 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#1E3A8A]" />
            FSRS 掌握程度分布
          </h2>
          <span className="text-sm text-[#64748B]">基于 {totalMastery} 道题目</span>
        </div>

        {/* 掌握程度卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {masteryData.map((item) => (
            <div
              key={item.label}
              className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                <span className="text-xs font-medium text-[#64748B]">{item.label}</span>
              </div>
              <div className="text-2xl font-bold text-[#0F172A]">{item.value}</div>
              <div className="text-xs text-[#94A3B8] mt-1">{item.desc}</div>
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: `${(item.value / totalMastery) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 整体进度条 */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-[#64748B]">整体掌握进度</span>
            <span className="text-sm font-bold text-[#0F172A]">
              {Math.round(((masteryData[0].value + masteryData[1].value) / totalMastery) * 100)}% 已掌握
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${(masteryData[0].value / totalMastery) * 100}%` }}
              title="熟练掌握"
            />
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{ width: `${(masteryData[1].value / totalMastery) * 100}%` }}
              title="基本掌握"
            />
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${(masteryData[2].value / totalMastery) * 100}%` }}
              title="需要复习"
            />
            <div
              className="bg-red-500 h-full transition-all duration-500"
              style={{ width: `${(masteryData[3].value / totalMastery) * 100}%` }}
              title="急需复习"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#94A3B8]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              熟练掌握
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              基本掌握
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              需要复习
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              急需复习
            </span>
          </div>
        </div>
      </div>

      {/* FSRS 详细统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 记忆保留率 */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <Award className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-[#64748B]">平均记忆保留率</span>
          </div>
          <div className="text-3xl font-bold text-[#0F172A] mb-2">
            {stats?.fsrs_stats?.average_retrievability || 0}%
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${stats?.fsrs_stats?.average_retrievability || 0}%` }}
            />
          </div>
          <p className="text-xs text-[#94A3B8] mt-2">反映整体记忆牢固程度</p>
        </div>

        {/* 平均稳定性 */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-cyan-50 rounded-xl">
              <Flame className="w-5 h-5 text-cyan-600" />
            </div>
            <span className="text-sm font-medium text-[#64748B]">平均稳定性</span>
          </div>
          <div className="text-3xl font-bold text-[#0F172A] mb-2">
            {stats?.fsrs_stats?.average_stability || 0}
            <span className="text-sm font-normal text-[#64748B] ml-1">天</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((stats?.fsrs_stats?.average_stability || 0) / 30 * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-[#94A3B8] mt-2">记忆保持的平均天数</p>
        </div>

        {/* 学习统计 */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-orange-50 rounded-xl">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-[#64748B]">学习统计</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#64748B]">总复习</span>
              <span className="font-semibold text-[#0F172A]">{stats?.fsrs_stats?.total_reviews || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#64748B]">总错误</span>
              <span className="font-semibold text-[#0F172A]">{stats?.fsrs_stats?.total_mistakes || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#64748B]">已学习</span>
              <span className="font-semibold text-[#0F172A]">{stats?.fsrs_stats?.total_learned || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 科目进度 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#1E3A8A]" />
            题库科目
          </h2>
          <span className="text-sm text-[#64748B]">{stats?.subjects?.length || 0} 个科目</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats?.subjects?.map((subject) => (
            <Link
              key={subject.name}
              to="/practice"
              state={{ subject: subject.name }}
              onClick={() => localStorage.setItem('f_practice_default_subject', subject.name)}
              className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-[#1E3A8A]/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
                    {subject.name.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0F172A] group-hover:text-[#1E3A8A] transition-colors">
                      {subject.name}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">{subject.total} 道题目</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#1E3A8A] group-hover:translate-x-1 transition-all" />
              </div>

              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#64748B]">学习进度</span>
                <span className="font-semibold text-[#0F172A]">{Math.round(subject.progress)}%</span>
              </div>

              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${subject.progress}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
