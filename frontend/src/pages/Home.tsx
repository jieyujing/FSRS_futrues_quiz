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

  useEffect(() => {
    loadStats();
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
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          开始刷题
        </Link>
      </div>

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
            <div key={subject.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{subject.name}</span>
                <span className="text-gray-500">
                  {subject.learned} / {subject.total}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${subject.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;