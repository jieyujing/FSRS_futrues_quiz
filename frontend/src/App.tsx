import React from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { GraduationCap, BookOpen, ClipboardList } from 'lucide-react';
import Home from './pages/Home';
import Practice from './pages/Practice';
import QuestionBank from './pages/QuestionBank';
import Exam from './pages/Exam';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* 导航栏 - 现代悬浮设计 */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] rounded-lg flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-[#0F172A] tracking-tight">期货刷题</span>
              </div>

              {/* 导航链接 */}
              <div className="flex items-center gap-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100'
                    }`
                  }
                >
                  首页
                </NavLink>
                <NavLink
                  to="/practice"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100'
                    }`
                  }
                >
                  <BookOpen className="w-4 h-4" />
                  刷题
                </NavLink>
                <NavLink
                  to="/exam"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100'
                    }`
                  }
                >
                  <ClipboardList className="w-4 h-4" />
                  模考
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* 主内容 */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/bank" element={<QuestionBank />} />
            <Route path="/exam" element={<Exam />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;