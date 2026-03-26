import React, { useState, useEffect } from 'react';
import { importApi } from '../services/api';
import { Upload, Trash2, RefreshCw } from 'lucide-react';

interface Source {
  source: string;
  count: number;
}

const QuestionBank: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState('基础知识');

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      const response = await importApi.sources();
      setSources(response.data);
    } catch (error) {
      console.error('加载题库列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await importApi.docx(file, subject);
      alert(`导入成功！共添加 ${response.data.added} 道题目`);
      loadSources();
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请检查文件格式');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteSource = async (sourceName: string) => {
    if (!confirm(`确定要删除 "${sourceName}" 的所有题目吗？`)) return;

    try {
      await importApi.deleteSource(sourceName);
      loadSources();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">题库管理</h1>

      {/* 导入区域 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">导入题库</h2>

        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm text-gray-600">科目：</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="基础知识">基础知识</option>
            <option value="法律法规">法律法规</option>
          </select>
        </div>

        <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
          {uploading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              导入中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              点击上传 docx 文件
            </span>
          )}
          <input
            type="file"
            accept=".docx"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* 已导入题库列表 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">已导入题库</h2>

        {loading ? (
          <div className="text-center py-4 text-gray-500">加载中...</div>
        ) : sources.length === 0 ? (
          <div className="text-center py-4 text-gray-500">暂无题库</div>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <div
                key={s.source}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium">{s.source}</div>
                  <div className="text-sm text-gray-500">{s.count} 道题目</div>
                </div>
                <button
                  onClick={() => handleDeleteSource(s.source)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;