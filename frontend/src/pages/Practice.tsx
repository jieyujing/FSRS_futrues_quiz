import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { practiceApi } from '../services/api';
import QuestionCard from '../components/QuestionCard';
import AnswerResult from '../components/AnswerResult';
import { RefreshCw, Loader2 } from 'lucide-react';
import PracticeSummary from '../components/PracticeSummary';

interface Question {
  id: number;
  question_type: string;
  content: string;
  options?: { [key: string]: string };
  mistake_count?: number;
}

interface PracticeState {
  questions: Question[];
  currentIndex: number;
  phase: 'question' | 'result' | 'summary';
  lastAnswer: {
    questionId: number;
    userAnswer: string;
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
  } | null;
  hasRated: boolean;
  sessionStats: {
    start_time: string;
    correct_count: number;
    total_count: number;
  };
  summaryData: any | null;
  questionStartTime: number;
}

const Practice: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<PracticeState>({
    questions: [],
    currentIndex: 0,
    phase: 'question',
    lastAnswer: null,
    hasRated: false,
    sessionStats: {
      start_time: new Date().toISOString(),
      correct_count: 0,
      total_count: 0,
    },
    summaryData: null,
    questionStartTime: Date.now(),
  });

  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const currentSubject = useMemo(() => {
    return (location.state as any)?.subject || localStorage.getItem('f_practice_default_subject') || undefined;
  }, [location.state]);

  const currentMode = useMemo(() => {
    return (location.state as any)?.mode || 'all';
  }, [location.state]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const response = currentMode === 'mistake' 
        ? await practiceApi.getMistakes(20, currentSubject)
        : await practiceApi.getNext(20, currentSubject);
      
      setState(prev => ({
        ...prev,
        questions: response.data,
        currentIndex: 0,
        phase: 'question',
        lastAnswer: null,
        hasRated: false,
        sessionStats: {
          start_time: new Date().toISOString(),
          correct_count: 0,
          total_count: response.data.length,
        },
        summaryData: null,
        questionStartTime: Date.now(),
      }));
    } catch (error) {
      console.error('加载题目失败:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSubject, currentMode]);

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleAnswer = async (answer: string) => {
    const currentQuestion = state.questions[state.currentIndex];
    if (!currentQuestion) return;

    const timeSpent = Math.max(1, Math.round((Date.now() - state.questionStartTime) / 1000));

    try {
      await practiceApi.recordAnswer({
        question_id: currentQuestion.id,
        user_answer: answer,
        time_spent: timeSpent,
      });

      const response = await practiceApi.answer({
        question_id: currentQuestion.id,
        user_answer: answer,
        time_spent: timeSpent,
      });

      setState(prev => ({
        ...prev,
        phase: 'result',
        lastAnswer: {
          questionId: currentQuestion.id,
          userAnswer: answer,
          isCorrect: response.data.is_correct,
          correctAnswer: response.data.correct_answer,
          explanation: response.data.explanation,
        },
        hasRated: false,
        sessionStats: {
          ...prev.sessionStats,
          correct_count: prev.sessionStats.correct_count + (response.data.is_correct ? 1 : 0),
        }
      }));
    } catch (error) {
      console.error('提交答案失败:', error);
    }
  };

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const questionIds = state.questions.map(q => q.id);
      const response = await practiceApi.getSummary({
        question_ids: questionIds,
        start_time: state.sessionStats.start_time,
      });
      setState(prev => ({
        ...prev,
        phase: 'summary',
        summaryData: response.data,
      }));
    } catch (error) {
      console.error('获取归纳失败:', error);
      // Fallback: 实在不行就跳过总结
      loadQuestions();
    } finally {
      setLoading(false);
    }
  }, [state.questions, state.sessionStats.start_time, loadQuestions]);

  const handleNext = useCallback(async () => {
    // 获取当前状态的快照，用于自动评分逻辑
    // 由于 handleNext 是 async 且可能被多次触发，我们在这里使用 state 的快照
    
    // 如果还没评分，则根据正确与否自动给一个默认评分 (3-良好 或 1-重来)
    // 这样可以确保就算用户不点击评分按钮，系统也会记录学习进度，更新题库统计
    if (state.lastAnswer && !state.hasRated) {
      try {
        const defaultRating = state.lastAnswer.isCorrect ? 3 : 1;
        await practiceApi.rate({
          question_id: state.lastAnswer.questionId,
          rating: defaultRating,
        });
        // 注意：这里不需要设置 hasRated 为 true，因为我们马上就要切到下一题了
      } catch (error) {
        console.error('自动评分失败:', error);
      }
    }

    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.questions.length) {
      // 进入总结阶段
      fetchSummary();
    } else {
      setState(prev => ({
        ...prev,
        currentIndex: nextIndex,
        phase: 'question',
        lastAnswer: null,
        hasRated: false,
        questionStartTime: Date.now(),
      }));
    }
  }, [state.currentIndex, state.questions.length, state.lastAnswer, state.hasRated, fetchSummary]);

  const handleRate = useCallback(async (rating: number) => {
    if (!state.lastAnswer || state.hasRated) return;

    try {
      await practiceApi.rate({
        question_id: state.lastAnswer.questionId,
        rating,
      });
      
      setState(prev => ({
        ...prev,
        hasRated: true
      }));

      // 评分后直接跳转下一题
      // 使用 setTimeout 稍微延迟，提升用户体验（能看到评分反馈）
      setTimeout(() => {
        setState(prev => {
          const nextIndex = prev.currentIndex + 1;
          if (nextIndex >= prev.questions.length) {
            // 这里不能直接在 setState 里调用 side effect
            // 实际上 handleNext 的 useCallback 已经包含了这个逻辑
            // 但为了简单，我们在外面调用
            return prev; 
          }
          return {
            ...prev,
            currentIndex: nextIndex,
            phase: 'question',
            lastAnswer: null,
            hasRated: false,
            questionStartTime: Date.now(),
          };
        });

        // 检查是否需要加载新题目
        if (state.currentIndex + 1 >= state.questions.length) {
          fetchSummary();
        }
      }, 200);
    } catch (error) {
      console.error('评分失败:', error);
    }
  }, [state.currentIndex, state.questions.length, state.lastAnswer, state.hasRated, fetchSummary]);

  const handleIgnore = useCallback(async () => {
    if (!state.lastAnswer) return;
    
    try {
      await practiceApi.markIgnored(state.lastAnswer.questionId);
      // 标记为忽略后，直接进入下一题
      handleNext();
    } catch (error) {
      console.error('标记忽略失败:', error);
    }
  }, [state.lastAnswer, handleNext]);

  const currentQuestion = state.questions[state.currentIndex];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="flex items-center gap-3 text-[#64748B]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">加载题目中...</span>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6">
        <div className="text-center">
          <div className="text-[#64748B] mb-2">暂无题目</div>
          <p className="text-sm text-[#94A3B8]">可能是题库为空或网络问题</p>
        </div>
        <button
          onClick={loadQuestions}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F172A] text-white rounded-xl font-semibold hover:bg-[#1E3A8A] transition-all duration-200 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 模式标题 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0F172A]">
          {currentMode === 'mistake' ? '错题强化练习' : '智能复习练习'}
        </h2>
        {currentSubject && (
          <span className="px-3 py-1 bg-blue-50 text-[#1E3A8A] text-xs font-bold rounded-full border border-blue-100">
            {currentSubject}
          </span>
        )}
      </div>

      {/* 进度条 */}
      <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-[#64748B]">答题进度</span>
          <span className="text-sm font-bold text-[#0F172A]">
            {state.currentIndex + 1} / {state.questions.length}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((state.currentIndex + 1) / state.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {state.phase === 'summary' && state.summaryData ? (
        <PracticeSummary
          data={state.summaryData}
          onContinue={loadQuestions}
          onExit={() => navigate('/')}
        />
      ) : state.phase === 'question' ? (
        <QuestionCard
          id={currentQuestion.id}
          questionType={currentQuestion.question_type}
          content={currentQuestion.content}
          options={currentQuestion.options}
          mistakeCount={currentQuestion.mistake_count}
          onAnswer={handleAnswer}
        />
      ) : (
        state.lastAnswer && currentQuestion && (
          <AnswerResult
            question={{
              id: currentQuestion.id,
              questionType: currentQuestion.question_type,
              content: currentQuestion.content,
              options: currentQuestion.options,
            }}
            userAnswer={state.lastAnswer.userAnswer}
            isCorrect={state.lastAnswer.isCorrect}
            correctAnswer={state.lastAnswer.correctAnswer}
            explanation={state.lastAnswer.explanation}
            onRate={handleRate}
            onIgnore={handleIgnore}
            onNext={handleNext}
          />
        )
      )}
    </div>
  );
};

export default Practice;
