import React, { useState, useEffect, useRef } from 'react';
import { examApi, importApi } from '../services/api';
import { 
  ClipboardList, 
  Play, 
  Trash2, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Award,
  Clock,
  Check,
  RotateCcw
} from 'lucide-react';

interface SourceItem {
  source: string;
  count: number;
}

interface ExamRecord {
  id: number;
  source: string;
  score: number;
  total_questions: number;
  correct_count: number;
  time_spent: number;
  created_at: string;
}

interface Question {
  id: number;
  subject: string;
  question_type: string;
  content: string;
  options?: { [key: string]: string };
}

interface QuestionCheckResult {
  question_id: number;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string;
}

interface ExamResult {
  score: number;
  total_questions: number;
  correct_count: number;
  results: QuestionCheckResult[];
}

const Exam: React.FC = () => {
  // 核心状态
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [history, setHistory] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 模考运行状态
  const [examActive, setExamActive] = useState(false);
  const [currentSource, setCurrentSource] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  
  // 计时器相关
  const [timeLeft, setTimeLeft] = useState(100 * 60); // 100分钟，以秒为单位
  const timerRef = useRef<any>(null);
  const examStartTimestamp = useRef<number>(0);

  // 结算状态
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. 加载准备数据
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [sourcesRes, historyRes] = await Promise.all([
        importApi.sources(),
        examApi.getHistory()
      ]);
      setSources(sourcesRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('加载初始化数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时的防灾检查（检查是否有未完成的模考）
  useEffect(() => {
    loadInitialData();

    const storedStartTime = localStorage.getItem('exam_start_time');
    const storedSource = localStorage.getItem('exam_source');
    const storedAnswers = localStorage.getItem('exam_answers');

    if (storedStartTime && storedSource) {
      const startTime = parseInt(storedStartTime, 10);
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const examDuration = 100 * 60; // 100分钟

      if (elapsedSeconds < examDuration) {
        // 可以恢复
        const confirmResume = window.confirm(`检测到您有正在进行的模考：\n试卷：${storedSource}\n已用时：${Math.floor(elapsedSeconds / 60)}分钟。\n是否继续考试？`);
        if (confirmResume) {
          setCurrentSource(storedSource);
          setTimeLeft(examDuration - elapsedSeconds);
          examStartTimestamp.current = startTime;
          if (storedAnswers) {
            setAnswers(JSON.parse(storedAnswers));
          }
          startExamSession(storedSource);
        } else {
          // 清除缓存
          clearExamStorage();
        }
      } else {
        // 超时清除
        clearExamStorage();
      }
    }
  }, []);

  const clearExamStorage = () => {
    localStorage.removeItem('exam_start_time');
    localStorage.removeItem('exam_source');
    localStorage.removeItem('exam_answers');
  };

  // 2. 开始模拟考试
  const startExam = async (source: string) => {
    const confirmStart = window.confirm(`确定开始模拟考试吗？\n试卷：${source}\n定时：100分钟\n\n考试过程中无法即时查看答案，交卷后将自动打分并记入错题本。`);
    if (!confirmStart) return;

    setCurrentSource(source);
    setTimeLeft(100 * 60);
    const now = Date.now();
    examStartTimestamp.current = now;
    setAnswers({});
    
    // 写入防灾缓存
    localStorage.setItem('exam_start_time', now.toString());
    localStorage.setItem('exam_source', source);
    localStorage.setItem('exam_answers', JSON.stringify({}));

    await startExamSession(source);
  };

  const startExamSession = async (source: string) => {
    setLoading(true);
    try {
      const res = await examApi.getQuestions(source);
      setQuestions(res.data);
      setCurrentIndex(0);
      setExamResult(null);
      setShowAnalysis(false);
      setExamActive(true);
    } catch (error) {
      console.error('加载试卷题目失败:', error);
      alert('加载试卷题目失败，请重试');
      clearExamStorage();
    } finally {
      setLoading(false);
    }
  };

  // 倒计时核心逻辑
  useEffect(() => {
    if (examActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [examActive]);

  // 自动提交（时间到）
  const handleAutoSubmit = () => {
    alert('考试时间到！系统已为您自动提交答卷。');
    submitExamAnswers(true);
  };

  // 3. 提交答卷
  const submitExamAnswers = async (force: boolean = false) => {
    if (!force) {
      const unansweredCount = questions.length - Object.keys(answers).length;
      let confirmMsg = '确定现在交卷吗？';
      if (unansweredCount > 0) {
        confirmMsg = `您还有 ${unansweredCount} 道题目未作答，确定要提前交卷吗？`;
      }
      const confirmSubmit = window.confirm(confirmMsg);
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const elapsedSeconds = Math.floor((Date.now() - examStartTimestamp.current) / 1000);
    const examDuration = 100 * 60;
    const actualTimeSpent = Math.min(elapsedSeconds, examDuration);

    try {
      const res = await examApi.submit({
        source: currentSource,
        answers: answers,
        time_spent: actualTimeSpent
      });

      setExamResult(res.data);
      setExamActive(false);
      clearExamStorage();
      loadInitialData(); // 重新加载历史模考列表
    } catch (error) {
      console.error('提交答卷失败:', error);
      alert('提交答卷失败，请检查网络后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除历史记录
  const deleteRecord = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这条考试记录吗？此操作不会影响错题本。')) return;

    try {
      await examApi.deleteHistory(id);
      loadInitialData();
    } catch (error) {
      console.error('删除模考记录失败:', error);
    }
  };

  // 4. 用户交互 - 作答处理
  const handleSelectOption = (questionId: number, optionKey: string, isMulti: boolean) => {
    setAnswers((prev) => {
      const currentAns = prev[questionId] || '';
      let nextAns = '';

      if (isMulti) {
        // 多选处理逻辑
        const selectedSet = new Set(currentAns.split(''));
        if (selectedSet.has(optionKey)) {
          selectedSet.delete(optionKey);
        } else {
          selectedSet.add(optionKey);
        }
        nextAns = Array.from(selectedSet).sort().join('');
      } else {
        // 单选/判断处理逻辑
        nextAns = optionKey;
      }

      const updatedAnswers = { ...prev, [questionId]: nextAns };
      localStorage.setItem('exam_answers', JSON.stringify(updatedAnswers));
      return updatedAnswers;
    });
  };

  const handleClearAnswer = (questionId: number) => {
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      localStorage.setItem('exam_answers', JSON.stringify(updated));
      return updated;
    });
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + '小时' : ''}${m}分${s < 10 ? '0' : ''}${s}秒`;
  };

  const formatSimpleTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 页面导航控制
  const currentQuestion = questions[currentIndex];
  const isMultiChoice = currentQuestion ? (currentQuestion.question_type.includes('多选') || currentQuestion.question_type.includes('不定项')) : false;

  // 5. 渲染各个子视图
  
  // 页面加载时的骨架屏
  if (loading && !examActive && sources.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-[#64748B]">
          <div className="w-5 h-5 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
          <span className="font-medium">初始化模考空间...</span>
        </div>
      </div>
    );
  }

  // A. 考试结算报告页面
  if (examResult && !examActive) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl overflow-hidden relative">
          {/* 背景光晕装饰 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full filter blur-3xl opacity-50 -z-10 translate-x-1/2 -translate-y-1/2" />
          
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] rounded-2xl flex items-center justify-center shadow-lg text-white">
              <Award className="w-10 h-10" />
            </div>
            
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">模拟考试提交成功</h2>
              <p className="text-[#64748B] mt-1.5 font-medium">试卷：{currentSource}</p>
            </div>

            {/* 得分圆形展示 */}
            <div className="relative flex items-center justify-center my-4">
              <div className="w-48 h-48 rounded-full border-8 border-gray-50 flex flex-col items-center justify-center shadow-inner bg-slate-50/50">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#0F172A] to-[#1E3A8A]">
                  {examResult.score}
                </span>
                <span className="text-xs font-semibold text-[#64748B] mt-1 tracking-wider uppercase">得分 (满分100)</span>
              </div>
            </div>

            {/* 数据指标 */}
            <div className="grid grid-cols-3 gap-6 w-full max-w-md bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="text-center">
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">题目总数</div>
                <div className="text-xl font-bold text-[#0F172A] mt-1">{examResult.total_questions}</div>
              </div>
              <div className="text-center border-x border-gray-200">
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">答对题数</div>
                <div className="text-xl font-bold text-emerald-600 mt-1">{examResult.correct_count}</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">答错/未答</div>
                <div className="text-xl font-bold text-rose-500 mt-1">
                  {examResult.total_questions - examResult.correct_count}
                </div>
              </div>
            </div>

            {/* 功能按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-2">
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-[#1E3A8A] transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <BookOpen className="w-5 h-5" />
                {showAnalysis ? '收起试卷解析' : '查看试卷解析'}
              </button>
              <button
                onClick={() => {
                  setExamResult(null);
                  loadInitialData();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-[#64748B] border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all duration-200"
              >
                <RotateCcw className="w-5 h-5" />
                返回模考首页
              </button>
            </div>
          </div>
        </div>

        {/* 校验解析面板 */}
        {showAnalysis && (
          <div className="space-y-6 animate-slideUp">
            <h3 className="text-xl font-bold text-[#0F172A] border-l-4 border-[#1E3A8A] pl-3">试卷解析明细</h3>
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const check = examResult.results.find(r => r.question_id === q.id);
                const isCorrect = check?.is_correct ?? false;
                const userAns = check?.user_answer ?? '';
                const correctAns = check?.correct_answer ?? '';

                return (
                  <div 
                    key={q.id} 
                    className={`bg-white rounded-2xl p-6 border transition-all duration-200 ${
                      isCorrect ? 'border-emerald-100 hover:border-emerald-200' : 'border-rose-100 hover:border-rose-200'
                    }`}
                  >
                    {/* 题目头部信息 */}
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-xs font-bold text-[#94A3B8]">
                        第 {idx + 1} 题 · {q.question_type}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            答对
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            答错
                          </>
                        )}
                      </span>
                    </div>

                    {/* 问题题干 */}
                    <div className="text-base font-semibold text-[#0F172A] leading-relaxed mb-4">
                      {q.content}
                    </div>

                    {/* 选项渲染 */}
                    {q.options && (
                      <div className="grid grid-cols-1 gap-2.5 mb-4">
                        {Object.entries(q.options).map(([key, value]) => {
                          const isUserSelected = userAns.includes(key);
                          const isCorrectOpt = correctAns.includes(key);
                          
                          let optClass = 'border-gray-200 text-[#0F172A] bg-white';
                          let icon = null;

                          if (isCorrectOpt) {
                            optClass = 'border-emerald-500 bg-emerald-50/30 text-emerald-800 font-medium';
                            icon = <Check className="w-4 h-4 text-emerald-600" />;
                          } else if (isUserSelected && !isCorrectOpt) {
                            optClass = 'border-rose-400 bg-rose-50/30 text-rose-800';
                            icon = <XCircle className="w-4 h-4 text-rose-500" />;
                          }

                          return (
                            <div
                              key={key}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm transition-all ${optClass}`}
                            >
                              <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                isCorrectOpt 
                                  ? 'bg-emerald-500 text-white' 
                                  : isUserSelected 
                                    ? 'bg-rose-500 text-white' 
                                    : 'bg-gray-100 text-[#64748B]'
                              }`}>
                                {key}
                              </span>
                              <div className="flex-1 leading-relaxed">{value}</div>
                              {icon}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 答题判定与解析 */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                      <div className="flex flex-wrap gap-4 text-xs font-semibold">
                        <span className="text-[#64748B]">
                          您的答案：
                          <span className={isCorrect ? 'text-emerald-600' : 'text-rose-500'}>
                            {userAns || '未作答'}
                          </span>
                        </span>
                        <span className="text-[#64748B]">
                          正确答案：<span className="text-[#0F172A]">{correctAns}</span>
                        </span>
                      </div>
                      {check?.explanation && (
                        <div className="text-xs text-[#64748B] pt-1.5 border-t border-gray-200/60 leading-relaxed">
                          <span className="font-bold text-[#0F172A] block mb-1">解析：</span>
                          {check.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // B. 考试作答中页面
  if (examActive && currentQuestion) {
    const userSelectedAnswer = answers[currentQuestion.id] || '';

    return (
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative items-start animate-fadeIn">
        {/* 吸顶计时与操作栏 */}
        <div className="lg:col-span-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-16 z-40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg text-[#0F172A]">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#64748B]">正在模拟考试：</span>
              <h4 className="font-bold text-[#0F172A] leading-tight text-sm sm:text-base line-clamp-1">{currentSource}</h4>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 倒计时 */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold transition-all ${
              timeLeft < 10 * 60 
                ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' 
                : 'bg-slate-50 border-gray-200 text-[#0F172A]'
            }`}>
              <Timer className="w-4 h-4" />
              <span>{formatSimpleTime(timeLeft)}</span>
            </div>

            <button
              disabled={submitting}
              onClick={() => submitExamAnswers(false)}
              className="px-5 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all duration-200 shadow-sm text-sm disabled:opacity-50"
            >
              {submitting ? '正在交卷...' : '提前交卷'}
            </button>
          </div>
        </div>

        {/* 左侧/中间题目栏 */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6 min-h-[400px] flex flex-col justify-between">
            <div>
              {/* 题目头部 */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <span className="px-3 py-1 bg-slate-50 border border-gray-200/80 text-xs font-bold rounded-full text-[#64748B]">
                  第 {currentIndex + 1} / {questions.length} 题
                </span>
                <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-xs font-bold rounded-full text-[#1E3A8A]">
                  {currentQuestion.question_type}
                </span>
              </div>

              {/* 题干内容 */}
              <div className="text-lg font-bold text-[#0F172A] leading-relaxed mb-6">
                {currentQuestion.content}
              </div>

              {/* 选项区域 */}
              {currentQuestion.options ? (
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(currentQuestion.options).map(([key, value]) => {
                    const isSelected = userSelectedAnswer.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => handleSelectOption(currentQuestion.id, key, isMultiChoice)}
                        className={`flex items-start text-left gap-3.5 p-4 rounded-xl border-2 transition-all duration-200 group cursor-pointer ${
                          isSelected 
                            ? 'border-[#0F172A] bg-slate-50 text-[#0F172A] font-medium shadow-sm' 
                            : 'border-gray-100 hover:border-gray-300 text-[#64748B] hover:text-[#0F172A] bg-white'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 transition-all ${
                          isSelected 
                            ? 'bg-[#0F172A] text-white scale-105' 
                            : 'bg-gray-50 text-[#64748B] group-hover:bg-gray-100'
                        }`}>
                          {key}
                        </span>
                        <div className="flex-1 leading-relaxed text-sm sm:text-base">{value}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[#64748B] italic text-sm">选项加载错误</div>
              )}
            </div>

            {/* 下方控制栏 */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-8">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
                上一题
              </button>

              {isMultiChoice && (
                <button
                  onClick={() => handleClearAnswer(currentQuestion.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#64748B] border border-gray-200 hover:border-red-200 hover:text-red-500 rounded-lg hover:bg-red-50/30 transition-all"
                >
                  清除当前作答
                </button>
              )}

              <button
                disabled={currentIndex === questions.length - 1}
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition-all"
              >
                下一题
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 右侧答题卡悬浮栏 */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 lg:sticky lg:top-36">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <h5 className="font-bold text-[#0F172A] text-sm sm:text-base">模考答题卡</h5>
            <span className="text-xs text-[#64748B]">
              已答 <strong className="text-[#0F172A]">{Object.keys(answers).length}</strong> / {questions.length}
            </span>
          </div>

          {/* 答题卡网格 */}
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const hasAnswered = !!answers[q.id];
              const isCurrent = idx === currentIndex;
              
              let btnClass = 'bg-white border-gray-200 text-[#64748B] hover:border-gray-300';
              if (hasAnswered) {
                btnClass = 'bg-slate-100 border-slate-300 text-[#0F172A] font-semibold';
              }
              if (isCurrent) {
                btnClass = 'bg-[#0F172A] border-[#0F172A] text-white font-bold ring-2 ring-offset-2 ring-slate-400';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-lg border flex items-center justify-center text-xs transition-all cursor-pointer ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-[#94A3B8] leading-normal pt-2 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#0F172A]"></span>
              当前题目
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-300"></span>
              已解答
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-white border border-gray-200"></span>
              未解答
            </span>
          </div>
        </div>
      </div>
    );
  }

  // C. 默认模考首页（选择试卷 + 历史成绩）
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-[#1E3A8A]" />
          模拟考试大厅
        </h1>
        <p className="text-[#64748B] mt-1">选择已导入的试卷进行 100 分钟限时模拟测试</p>
      </div>

      {/* 试卷列表 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          选择考试试卷
        </h2>

        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[#94A3B8] border-2 border-dashed border-gray-200 rounded-xl">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p className="text-sm">暂未检测到已导入的试题</p>
            <p className="text-xs mt-1">请先在「首页」或「题库导入」导入 word/docx 题库</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((item) => (
              <div
                key={item.source}
                onClick={() => startExam(item.source)}
                className="group bg-white p-5 rounded-2xl border border-gray-100 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A] group-hover:text-indigo-600 transition-colors leading-tight line-clamp-1">
                      {item.source}
                    </h4>
                    <p className="text-xs text-[#64748B] mt-1">总题数：{item.count} 道</p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-slate-50 group-hover:bg-[#0F172A] text-xs font-bold text-[#64748B] group-hover:text-white rounded-xl transition-all flex items-center gap-1 shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  开始模考
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 历史成绩 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-500" />
          历史模考记录
        </h2>

        {history.length === 0 ? (
          <div className="text-center py-10 text-[#94A3B8] italic text-sm bg-gray-50/50 rounded-xl border border-gray-100">
            暂无模拟考试记录，做一套卷子测试一下吧！
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full border-collapse bg-white text-left text-sm text-gray-500">
              <thead className="bg-slate-50 text-xs font-semibold text-[#64748B] uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">试卷名称</th>
                  <th className="px-6 py-4">考试得分</th>
                  <th className="px-6 py-4">答对分布</th>
                  <th className="px-6 py-4">考试用时</th>
                  <th className="px-6 py-4">考试时间</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 border-t border-gray-100">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#0F172A] max-w-[240px] truncate">
                      {record.source}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-base font-extrabold ${
                        record.score >= 80 
                          ? 'text-emerald-600' 
                          : record.score >= 60 
                            ? 'text-indigo-600' 
                            : 'text-rose-500'
                      }`}>
                        {record.score} 分
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-[#64748B]">
                      {record.correct_count} / {record.total_questions}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#64748B] flex items-center gap-1.5 mt-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(record.time_spent)}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#94A3B8]">
                      {new Date(record.created_at).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => deleteRecord(record.id, e)}
                        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="删除考试记录"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exam;
