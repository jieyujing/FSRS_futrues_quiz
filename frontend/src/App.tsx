import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Practice from './pages/Practice';
import QuestionBank from './pages/QuestionBank';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        {/* 导航栏 */}
        <nav className="bg-white shadow">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="font-bold text-xl text-blue-600">期货刷题</div>
              <div className="flex gap-4">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`
                  }
                >
                  首页
                </NavLink>
                <NavLink
                  to="/practice"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`
                  }
                >
                  刷题
                </NavLink>
                <NavLink
                  to="/bank"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`
                  }
                >
                  题库
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* 主内容 */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/bank" element={<QuestionBank />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;