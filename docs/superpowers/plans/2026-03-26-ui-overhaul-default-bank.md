# 期货刷题助手 UI 升级与默认题库持久化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现默认题库持久化记忆功能，并全面升级首页和刷题页的交互视觉效果。

**Architecture:** 前端通过 `localStorage` 实现状态持久化，UI 使用 Tailwind CSS 的 transition 和 transform 特效实现动态反馈。

**Tech Stack:** React, Tailwind CSS, Lucide React.

---

### Task 1: 默认题库持久化逻辑

**Files:**
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/pages/Practice.tsx`

- [ ] **Step 1: 在 Home.tsx 中增加记录逻辑**
修改 `Home.tsx`，当点击“开始刷题”或进入科目时，记录该科目。
```typescript
// 在跳转逻辑中加入
localStorage.setItem('f_practice_default_subject', subjectName);
```

- [ ] **Step 2: 在 Home.tsx 中增加“继续学习”按钮**
在统计卡片上方增加一个基于 `localStorage` 的快捷入口。
```tsx
const [defaultSubject, setDefaultSubject] = useState<string | null>(null);
useEffect(() => {
  setDefaultSubject(localStorage.getItem('f_practice_default_subject'));
}, []);

// UI 中显示
{defaultSubject && (
  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center mb-6">
    <div>
      <p className="text-sm text-blue-600 font-medium">继续上次练习</p>
      <h3 className="text-lg font-bold text-blue-900">{defaultSubject}</h3>
    </div>
    <Link to="/practice" state={{ subject: defaultSubject }} className="...">继续</Link>
  </div>
)}
```

- [ ] **Step 3: 修改 Practice.tsx 以优先使用传入或记录的科目**
```typescript
const location = useLocation();
const subject = location.state?.subject || localStorage.getItem('f_practice_default_subject');

const loadQuestions = async () => {
  // ...
  const response = await practiceApi.getNext(20, subject || undefined);
  // ...
};
```

- [ ] **Step 4: 运行并验证**
确认刷新页面后能看到“继续学习”按钮，且点击能进入该科目。

---

### Task 2: 首页 UI 升级（卡片式交互）

**Files:**
- Modify: `frontend/src/pages/Home.tsx`

- [ ] **Step 1: 升级科目列表样式**
将原本的简单列表改为 Grid 布局的卡片，并添加 Hover 动画效果。
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {stats.subjects.map((subject) => (
    <div 
      key={subject.name}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{subject.name}</h3>
        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{subject.total} 题</span>
      </div>
      {/* 进度条动画 */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-1000 ease-out"
          style={{ width: `${subject.progress}%` }}
        />
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 2: 优化统计卡片视觉**
为四个统计卡片增加渐变背景或更精致的阴影。

- [ ] **Step 3: 运行并验证**
确认鼠标悬浮在卡片上时有平滑的升起效果，进度条进入页面时有增长动画。

---

### Task 3: 刷题页答题反馈动效

**Files:**
- Modify: `frontend/src/components/QuestionCard.tsx`
- Modify: `frontend/src/components/AnswerResult.tsx`

- [ ] **Step 1: 为选项点击增加交互类名**
在 `QuestionCard.tsx` 中，根据选中状态添加 Tailwind 动画类。
```tsx
// 答对时的跳动动画 (自定义或使用 Tailwind 现有类)
"animate-bounce" // 仅作为参考，实际可用简单的 transform 组合
```

- [ ] **Step 2: 优化结果展示组件**
修改 `AnswerResult.tsx`，使用 `opacity` 和 `translate-y` 实现解析内容的淡入。
```tsx
<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
  {/* 解析内容 */}
</div>
```

- [ ] **Step 3: 运行并验证**
进行模拟答题，确认正确/错误反馈具有明显的视觉动效。
