import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { practiceApi } from '../services/api';
import QuestionCard from '../components/QuestionCard';
import AnswerResult from '../components/AnswerResult';

interface Question {
  id: number;
  question_type: string;
  content: string;
  options?: { [key: string]: string };
}

interface PracticeState {
  questions: Question[];
  currentIndex: number;
  phase: 'question' | 'result';
  lastAnswer: {
    questionId: number;
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
  } | null;
}

const Practice: React.FC = () => {
  const [state, setState] = useState<PracticeState>({
    questions: [],
    currentIndex: 0,
    phase: 'question',
    lastAnswer: null,
  });

  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const currentSubject = useMemo(() => {
    return (location.state as any)?.subject || localStorage.getItem('f_practice_default_subject') || undefined;
  }, [location.state]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await practiceApi.getNext(20, currentSubject);
      setState(prev => ({
        ...prev,
        questions: response.data,
        currentIndex: 0,
        phase: 'question',
        lastAnswer: null,
      }));
    } catch (error) {
      console.error('加载题目失败:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSubject]);

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleAnswer = async (answer: string) => {
    const currentQuestion = state.questions[state.currentIndex];
    if (!currentQuestion) return;

    try {
      // 先记录答案
      await practiceApi.recordAnswer({
        question_id: currentQuestion.id,
        user_answer: answer,
      });

      // 获取结果
      const response = await practiceApi.answer({
        question_id: currentQuestion.id,
        user_answer: answer,
      });

      setState(prev => ({
        ...prev,
        phase: 'result',
        lastAnswer: {
          questionId: currentQuestion.id,
          isCorrect: response.data.is_correct,
          correctAnswer: response.data.correct_answer,
          explanation: response.data.explanation,
        },
      }));
    } catch (error) {
      console.error('提交答案失败:', error);
    }
  };

  const handleRate = async (rating: number) => {
    if (!state.lastAnswer) return;

    try {
      await practiceApi.rate({
        question_id: state.lastAnswer.questionId,
        rating,
      });
    } catch (error) {
      console.error('评分失败:', error);
    }
  };

  const handleNext = useCallback(() => {
    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.questions.length) {
      // 加载更多题目
      loadQuestions();
    } else {
      setState(prev => ({
        ...prev,
        currentIndex: nextIndex,
        phase: 'question',
        lastAnswer: null,
      }));
    }
  }, [state.currentIndex, state.questions.length]);

  const currentQuestion = state.questions[state.currentIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-gray-500 mb-4">暂无题目</div>
        <button
          onClick={loadQuestions}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 进度条 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>进度</span>
          <span>{state.currentIndex + 1} / {state.questions.length}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((state.currentIndex + 1) / state.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 题目/结果 */}
      {state.phase === 'question' ? (
        <QuestionCard
          id={currentQuestion.id}
          questionType={currentQuestion.question_type}
          content={currentQuestion.content}
          options={currentQuestion.options}
          onAnswer={handleAnswer}
        />
      ) : (
        state.lastAnswer && (
          <AnswerResult
            isCorrect={state.lastAnswer.isCorrect}
            correctAnswer={state.lastAnswer.correctAnswer}
            explanation={state.lastAnswer.explanation}
            onRate={handleRate}
            onNext={handleNext}
          />
        )
      )}
    </div>
  );
};

export default Practice;