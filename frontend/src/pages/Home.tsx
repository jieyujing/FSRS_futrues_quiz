import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { practiceApi } from '../services/api';
import { BookOpen, CheckCircle, Clock, Target } from 'lucide-react';

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
}

const Home: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [defaultSubject, setDefaultSubject] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    // 读取记录的默认科目
    const saved = localStorage.getItem('f_practice_default_subject');
    if (saved) {
      setDefaultSubject(saved);
    }
  }, []);

  const loadStats = async () => {
    try {
      const response = await practiceApi.dashboard();
      setStats(response.data);
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">暂无数据，请先导入题库</div>
        <Link
          to="/bank"
          className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          导入题库
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">期货刷题助手</h1>
        <Link
          to="/practice"
          state={{ subject: defaultSubject }}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          开始刷题
        </Link>
      </div>

      {/* 继续练习入口 */}
      {defaultSubject && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-200 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">继续上次练习</p>
              <h3 className="text-lg font-bold text-blue-900">{defaultSubject}</h3>
            </div>
          </div>
          <Link
            to="/practice"
            state={{ subject: defaultSubject }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            立即执行
          </Link>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">总题数</div>
              <div className="text-xl font-bold">{stats.total_questions}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">已学习</div>
              <div className="text-xl font-bold">{stats.learned}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">今日待复习</div>
              <div className="text-xl font-bold">{stats.due_today}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">正确率</div>
              <div className="text-xl font-bold">{stats.accuracy_rate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 科目进度 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">学习进度</h2>
        <div className="space-y-4">
          {stats.subjects.map((subject) => (
            <Link 
              key={subject.name} 
              to="/practice" 
              state={{ subject: subject.name }}
              onClick={() => localStorage.setItem('f_practice_default_subject', subject.name)}
              className="block group"
            >
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 group-hover:text-blue-600 transition-colors">{subject.name}</span>
                <span className="text-gray-500">
                  {subject.learned} / {subject.total}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 group-hover:bg-blue-600 transition-all"
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