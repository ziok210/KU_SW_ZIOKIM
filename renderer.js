/**
 * renderer.js - 렌더러 프로세스 파일 (프론트엔드 비즈니스 로직)
 * 
 * HTML 화면의 요소를 선택하고, 이벤트를 처리하며,
 * Electron main.js와 통신하여 데이터를 영구 저장합니다.
 * 초보자가 이해하기 쉽도록 상세한 주석을 달아 작성되었습니다.
 */

// ==========================================================================
// 1. 전역 애플리케이션 상태 (Global State)
// ==========================================================================
let appData = {
  todos: [],    // 할 일 목록: { id, title, date, priority, completed }
  notes: [],    // 메모 목록: { id, title, content, updatedAt }
  diaries: {}   // 일기 목록: { 'YYYY-MM-DD': '일기 내용...' }
};

// 현재 일기장에서 선택된 날짜 (기본값: 오늘 날짜 YYYY-MM-DD 형식)
let selectedDiaryDate = ""; 
// 달력 렌더링 시 기준이 되는 연도와 월
let calendarYear = 2026;
let calendarMonth = 5; // 0이 1월, 5는 6월 (JavaScript Date 규격과 동일)

// ==========================================================================
// 2. DOM 요소 선택 (DOM Elements)
// ==========================================================================

// 공통 / 테마 및 내비게이션
const menuItems = document.querySelectorAll('.menu-item');
const tabPanels = document.querySelectorAll('.tab-panel');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn.querySelector('.theme-icon');
const themeText = themeToggleBtn.querySelector('.theme-text');

// 대시보드 관련
const todayTodoCountEl = document.getElementById('today-todo-count');
const todoProgressPercentEl = document.getElementById('todo-progress-percent');
const todoRatioTextEl = document.getElementById('todo-ratio-text');
const progressRingCircle = document.querySelector('.progress-ring__circle');
const dashboardTodoList = document.getElementById('dashboard-todo-list');
const dashboardNotesList = document.getElementById('dashboard-notes-list');
const goToTodoTabBtn = document.getElementById('go-to-todo-tab');
const goToNotesTabBtn = document.getElementById('go-to-notes-tab');

// To-Do 관련
const todoForm = document.getElementById('todo-form');
const todoFormTitle = document.getElementById('todo-form-title');
const todoEditIdInput = document.getElementById('todo-edit-id');
const todoInput = document.getElementById('todo-input');
const todoDateInput = document.getElementById('todo-date');
const todoPriorityInput = document.getElementById('todo-priority');
const todoSaveBtn = document.getElementById('todo-save-btn');
const todoCancelBtn = document.getElementById('todo-cancel-btn');
const todoList = document.getElementById('todo-list');
const filterButtons = document.querySelectorAll('.filter-btn');
let currentTodoFilter = 'all'; // 'all' | 'active' | 'completed'

// 메모 관련
const notesList = document.getElementById('notes-list');
const newNoteBtn = document.getElementById('new-note-btn');
const noteEditorEmpty = document.getElementById('note-editor-empty');
const noteEditorForm = document.getElementById('note-editor-form');
const noteEditIdInput = document.getElementById('note-edit-id');
const noteTitleInput = document.getElementById('note-title-input');
const noteContentInput = document.getElementById('note-content-input');
const noteSaveBtn = document.getElementById('note-save-btn');
const noteDeleteBtn = document.getElementById('note-delete-btn');
const noteSavedTime = document.getElementById('note-saved-time');

// 일기 관련
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const calendarMonthYear = document.getElementById('calendar-month-year');
const calendarDaysGrid = document.getElementById('calendar-days');
const selectedDateTitle = document.getElementById('selected-date-title');
const diaryFormContainer = document.getElementById('diary-form-container');
const diaryContentInput = document.getElementById('diary-content');
const diarySaveBtn = document.getElementById('diary-save-btn');
const diaryDeleteBtn = document.getElementById('diary-delete-btn');
const diaryEmptyMessage = document.getElementById('diary-empty-message');

// 검색 관련
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResultsContent = document.getElementById('search-results-content');
const searchEmptyState = document.getElementById('search-empty');
const searchTodoList = document.getElementById('search-todo-list');
const searchNotesList = document.getElementById('search-notes-list');
const searchDiaryList = document.getElementById('search-diary-list');
const countTodoEl = document.getElementById('count-todo');
const countNotesEl = document.getElementById('count-notes');
const countDiaryEl = document.getElementById('count-diary');


// ==========================================================================
// 3. 앱 초기화 & 데이터 연동 (Initialization & Data Persistence)
// ==========================================================================

// 앱 시작 시 실행될 로직
window.addEventListener('DOMContentLoaded', async () => {
  console.log("=== [STARTUP] 1. DOMContentLoaded 이벤트 발생 ===");
  console.log("Smart Planner: App initialized, window.api exists:", !!window.api);

  // 오늘 날짜 기본값으로 세팅
  const today = new Date();
  calendarYear = today.getFullYear();
  calendarMonth = today.getMonth();
  selectedDiaryDate = getFormattedDate(today);

  // 마감일 입력칸 기본값을 오늘 날짜로 세팅
  todoDateInput.value = selectedDiaryDate;

  console.log("=== [STARTUP] 2. loadAllData 호출 시작 ===");
  // Electron 메인 프로세스로부터 저장된 데이터를 비동기로 가져옵니다.
  await loadAllData();
  console.log("=== [STARTUP] 3. loadAllData 호출 완료 ===");

  console.log("=== [STARTUP] 4. initTheme 호출 시작 ===");
  // 최초 화면 초기화
  initTheme();
  console.log("=== [STARTUP] 5. setupEventListeners 호출 시작 ===");
  setupEventListeners();
  console.log("=== [STARTUP] 6. updateUI 호출 시작 ===");
  updateUI();
  console.log("=== [STARTUP] 7. 초기화 완료 ===");
});

/**
 * 메인 프로세스(IPC) 및 LocalStorage를 호출하여 로컬 저장 데이터를 로드합니다.
 */
async function loadAllData() {
  // [1단계] 우선순위 1: 브라우저 LocalStorage에서 안전하게 데이터를 즉시 복구합니다.
  try {
    const localSaved = localStorage.getItem('life_schedule_data');
    if (localSaved) {
      const parsed = JSON.parse(localSaved);
      appData.todos = parsed.todos || [];
      appData.notes = parsed.notes || [];
      appData.diaries = parsed.diaries || {};
      console.log("렌더러: LocalStorage로부터 데이터 복구 완료:", appData);
    }
  } catch (err) {
    console.error("LocalStorage 읽기 실패:", err);
  }

  // [2단계] 우선순위 2: Electron IPC를 통해 로컬 물리 파일(planner_data.json)에서 읽어와 연동합니다.
  if (window.api && window.api.loadData) {
    try {
      const savedData = await window.api.loadData();
      console.log("렌더러: 불러온 물리 파일 데이터 객체:", savedData);
      
      // 파일 데이터가 존재하고 비어있지 않다면 최신 데이터를 덮어쓰고 동기화합니다.
      if (savedData && (savedData.todos?.length > 0 || savedData.notes?.length > 0 || Object.keys(savedData.diaries || {}).length > 0)) {
        appData.todos = savedData.todos || appData.todos;
        appData.notes = savedData.notes || appData.notes;
        appData.diaries = savedData.diaries || appData.diaries;
        
        // 파일 데이터를 기준으로 LocalStorage도 최신화합니다.
        localStorage.setItem('life_schedule_data', JSON.stringify(appData));
      }
    } catch (e) {
      console.error("물리 파일 데이터 불러오기 실패:", e);
    }
  } else {
    console.warn("렌더러: window.api.loadData 가 존재하지 않아 로컬 스토리지로 단독 동작합니다.");
  }
}

/**
 * 현재 메모리에 있는 전역 데이터를 파일(IPC) 및 LocalStorage에 영구 저장합니다.
 */
async function saveAllData() {
  if (window.api && window.api.saveData) {
    try {
      console.log("렌더러: 저장 요청 전송 데이터:", appData);
      const result = await window.api.saveData(appData);
      console.log("렌더러: 저장 처리 결과:", result);
      
      if (result && result.success) {
        console.log("로컬 데이터 파일 저장 성공");
      } else {
        alert("데이터 저장 실패: " + (result ? result.error : "알 수 없는 응답"));
      }
      
      // 저장 후 실시간으로 대시보드 등의 UI도 리렌더링
      updateUI();
    } catch (e) {
      console.error("데이터 저장 실패:", e);
      alert("데이터 저장 API 호출 중 오류 발생: " + e.message);
    }
  } else {
    console.error("렌더러: window.api.saveData 가 정의되어 있지 않습니다.");
  }
}

/**
 * 모든 화면 구성 요소를 최신 데이터 상태로 업데이트합니다.
 */
function updateUI() {
  renderDashboard();
  renderTodoList();
  renderNotesList();
  renderCalendar();
  updateDiarySection();
}


// ==========================================================================
// 4. 유틸리티 함수 (Utility Functions)
// ==========================================================================

/**
 * Date 객체를 YYYY-MM-DD 형태의 문자열로 변환합니다.
 */
function getFormattedDate(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 현재 시간을 YYYY-MM-DD HH:MM:SS 형태로 포맷팅합니다.
 */
function getFormattedDateTime(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  const sec = String(dateObj.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
}


// ==========================================================================
// 5. 공통 이벤트 리스너 설정 (Global Event Listeners)
// ==========================================================================
function setupEventListeners() {
  
  // 5-A. 사이드바 메뉴 탭 전환 이벤트
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // 5-B. 테마 토글 버튼 클릭
  themeToggleBtn.addEventListener('click', () => {
    toggleTheme();
  });

  // 5-C. 대시보드 바로가기 버튼들 연동
  goToTodoTabBtn.addEventListener('click', () => switchTab('todo'));
  goToNotesTabBtn.addEventListener('click', () => switchTab('notes'));

  // 5-D. To-Do 이벤트 연동
  todoForm.addEventListener('submit', handleTodoSubmit);
  todoCancelBtn.addEventListener('click', resetTodoForm);
  
  // To-Do 필터 버튼 연동
  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentTodoFilter = e.target.getAttribute('data-filter');
      renderTodoList();
    });
  });

  // 5-E. 메모 이벤트 연동
  newNoteBtn.addEventListener('click', createNewNoteState);
  noteSaveBtn.addEventListener('click', handleNoteSave);
  noteDeleteBtn.addEventListener('click', handleNoteDelete);

  // 5-F. 일기 이벤트 연동
  prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
  nextMonthBtn.addEventListener('click', () => navigateMonth(1));
  diarySaveBtn.addEventListener('click', handleDiarySave);
  diaryDeleteBtn.addEventListener('click', handleDiaryDelete);

  // 5-G. 통합 검색 이벤트 연동
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
}

/**
 * 지정된 탭으로 화면을 전환합니다.
 * @param {string} tabId 전환할 탭 아이디 ('dashboard', 'todo', 'notes', 'diary', 'search')
 */
function switchTab(tabId) {
  // 사이드바 버튼 활성화 상태 표시 변경
  menuItems.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 본문 콘텐츠 활성화 상태 변경
  tabPanels.forEach(panel => {
    if (panel.id === `tab-${tabId}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // 특정 탭 이동 시 특수 상태 초기화 또는 리프레시
  if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'diary') {
    renderCalendar();
    updateDiarySection();
  }
}


// ==========================================================================
// 6. 테마 설정 (Theme Management)
// ==========================================================================

function initTheme() {
  // 로컬 스토리지에 테마 설정이 없으면 다크 모드를 기본값으로 설정
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    themeIcon.textContent = "☀️";
    themeText.textContent = "라이트 모드";
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    themeIcon.textContent = "🌙";
    themeText.textContent = "다크 모드";
  }
}

function toggleTheme() {
  if (document.body.classList.contains('dark-theme')) {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    themeIcon.textContent = "☀️";
    themeText.textContent = "라이트 모드";
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    themeIcon.textContent = "🌙";
    themeText.textContent = "다크 모드";
    localStorage.setItem('theme', 'dark');
  }
}


// ==========================================================================
// 7. 대시보드 렌더링 (Dashboard Logic)
// ==========================================================================
function renderDashboard() {
  const todayStr = getFormattedDate(new Date());
  
  // 7-1. 오늘 마감 예정이고 완료되지 않은 할 일 개수 산출
  const todayTodos = appData.todos.filter(t => t.date === todayStr && !t.completed);
  todayTodoCountEl.textContent = todayTodos.length;

  // 7-2. 전체 완료 비율 계산 및 프로그레스 링 갱신
  const totalCount = appData.todos.length;
  const completedCount = appData.todos.filter(t => t.completed).length;
  let percent = 0;

  if (totalCount > 0) {
    percent = Math.round((completedCount / totalCount) * 100);
  }

  todoProgressPercentEl.textContent = `${percent}%`;
  todoRatioTextEl.textContent = `${completedCount} / ${totalCount} 완료됨`;

  // SVG 원주 길이(314.159)를 이용하여 완료율만큼 도넛 게이지 채우기
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // 약 314.159
  const offset = circumference - (percent / 100) * circumference;
  progressRingCircle.style.strokeDashoffset = offset;

  // 7-3. 오늘 할 일 목록 요약 리스트 렌더링
  dashboardTodoList.innerHTML = "";
  const todayAllTodos = appData.todos.filter(t => t.date === todayStr);

  if (todayAllTodos.length === 0) {
    dashboardTodoList.innerHTML = `<li class="empty-state">오늘 마감인 할 일이 없습니다. 😊</li>`;
  } else {
    // 마감일이 오늘인 리스트를 렌더링
    todayAllTodos.forEach(todo => {
      const li = document.createElement('li');
      li.className = todo.completed ? 'completed' : '';
      
      const priorityLabel = todo.priority === 'high' ? '상' : (todo.priority === 'medium' ? '중' : '하');
      const priorityClass = `priority-${todo.priority}`;
      
      li.innerHTML = `
        <span style="${todo.completed ? 'text-decoration: line-through;' : ''}">${todo.title}</span>
        <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
      `;
      dashboardTodoList.appendChild(li);
    });
  }

  // 7-4. 최근 메모 (최대 3개) 요약 리스트 렌더링
  dashboardNotesList.innerHTML = "";
  // 최근 수정된 순으로 정렬
  const sortedNotes = [...appData.notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const recentNotes = sortedNotes.slice(0, 3);

  if (recentNotes.length === 0) {
    dashboardNotesList.innerHTML = `<li class="empty-state">저장된 메모가 없습니다.</li>`;
  } else {
    recentNotes.forEach(note => {
      const li = document.createElement('li');
      li.style.cursor = 'pointer';
      // 클릭 시 해당 메모 뷰로 이동
      li.addEventListener('click', () => {
        switchTab('notes');
        selectNote(note.id);
      });

      li.innerHTML = `
        <strong>${note.title || "제목 없음"}</strong>
        <span style="font-size: 11px; color: var(--text-muted);">${note.updatedAt.split(' ')[0]}</span>
      `;
      dashboardNotesList.appendChild(li);
    });
  }
}


// ==========================================================================
// 8. 할 일 관리 (To-Do Section)
// ==========================================================================

/**
 * 할 일 폼 저장 처리 (추가 또는 수정 완료)
 */
function handleTodoSubmit(e) {
  e.preventDefault();

  const id = todoEditIdInput.value;
  const title = todoInput.value.trim();
  const date = todoDateInput.value;
  const priority = todoPriorityInput.value;

  if (!title || !date) return;

  if (id) {
    // 수정 모드
    const todoIndex = appData.todos.findIndex(t => t.id === id);
    if (todoIndex > -1) {
      appData.todos[todoIndex].title = title;
      appData.todos[todoIndex].date = date;
      appData.todos[todoIndex].priority = priority;
    }
  } else {
    // 신규 추가 모드
    const newTodo = {
      id: Date.now().toString(),
      title: title,
      date: date,
      priority: priority,
      completed: false
    };
    appData.todos.push(newTodo);
  }

  // 저장 및 폼 리셋
  saveAllData();
  resetTodoForm();
}

/**
 * 수정 폼을 초기화하고 원래 "추가하기" 모드로 복구합니다.
 */
function resetTodoForm() {
  todoFormTitle.textContent = "할 일 추가하기";
  todoEditIdInput.value = "";
  todoInput.value = "";
  todoDateInput.value = getFormattedDate(new Date());
  todoPriorityInput.value = "medium";
  todoSaveBtn.textContent = "추가하기";
  todoCancelBtn.classList.add('hidden');
}

/**
 * 할 일 목록을 화면에 렌더링합니다.
 */
function renderTodoList() {
  todoList.innerHTML = "";

  // 현재 필터링 기준에 맞춰 필터링
  let filteredTodos = appData.todos;
  if (currentTodoFilter === 'active') {
    filteredTodos = appData.todos.filter(t => !t.completed);
  } else if (currentTodoFilter === 'completed') {
    filteredTodos = appData.todos.filter(t => t.completed);
  }

  // 날짜순 및 우선순위 순으로 가볍게 정렬 (마감일 오름차순)
  filteredTodos.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (filteredTodos.length === 0) {
    todoList.innerHTML = `<li class="empty-state" style="text-align:center; padding: 30px; color: var(--text-muted);">할 일이 없습니다.</li>`;
    return;
  }

  filteredTodos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    
    // 우선순위 한글 라벨 및 클래스 설정
    const priorityLabel = todo.priority === 'high' ? '상' : (todo.priority === 'medium' ? '중' : '하');
    const priorityClass = `priority-${todo.priority}`;
    
    // 오늘 마감일 경우 날짜 강조 표시
    const todayStr = getFormattedDate(new Date());
    const isToday = todo.date === todayStr;
    const dateDisplayClass = isToday ? 'style="color: var(--danger); font-weight: bold;"' : '';

    li.innerHTML = `
      <div class="todo-item-left">
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
        <div class="todo-details">
          <span class="todo-title">${todo.title}</span>
          <div class="todo-meta">
            <span ${dateDisplayClass}>📅 ${todo.date} ${isToday ? '(오늘 마감)' : ''}</span>
            <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
          </div>
        </div>
      </div>
      <div class="todo-item-right">
        <button class="btn-icon edit-todo-btn" title="수정">✏️</button>
        <button class="btn-icon delete-todo-btn" title="삭제">❌</button>
      </div>
    `;

    // 8-1. 완료 여부 체크박스 토글 핸들러
    const checkbox = li.querySelector('.todo-checkbox');
    checkbox.addEventListener('change', () => {
      todo.completed = checkbox.checked;
      saveAllData();
    });

    // 8-2. 수정 버튼 클릭 핸들러
    const editBtn = li.querySelector('.edit-todo-btn');
    editBtn.addEventListener('click', () => {
      startEditTodo(todo);
    });

    // 8-3. 삭제 버튼 클릭 핸들러
    const deleteBtn = li.querySelector('.delete-todo-btn');
    deleteBtn.addEventListener('click', () => {
      if (confirm('이 할 일을 삭제하시겠습니까?')) {
        appData.todos = appData.todos.filter(t => t.id !== todo.id);
        saveAllData();
      }
    });

    todoList.appendChild(li);
  });
}

/**
 * 특정 할 일을 수정하기 위해 입력 폼으로 값을 불러옵니다.
 */
function startEditTodo(todo) {
  todoFormTitle.textContent = "할 일 수정하기";
  todoEditIdInput.value = todo.id;
  todoInput.value = todo.title;
  todoDateInput.value = todo.date;
  todoPriorityInput.value = todo.priority;
  todoSaveBtn.textContent = "수정완료";
  todoCancelBtn.classList.remove('hidden');
  
  // 폼이 위치한 쪽으로 부드러운 스크롤 이동 (선택적 편의 기능)
  todoForm.scrollIntoView({ behavior: 'smooth' });
}


// ==========================================================================
// 9. 메모장 관리 (Notes Section)
// ==========================================================================

/**
 * 메모 사이드바 리스트 렌더링
 */
function renderNotesList() {
  notesList.innerHTML = "";

  // 최신 수정 시간 순서대로 정렬하여 출력
  const sortedNotes = [...appData.notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  sortedNotes.forEach(note => {
    const li = document.createElement('li');
    // 현재 열려있는 에디터 메모와 일치하면 active 클래스 추가
    const isActive = noteEditIdInput.value === note.id;
    
    li.className = `note-menu-item ${isActive ? 'active' : ''}`;
    
    // 내용 요약 추출
    const excerpt = note.content ? note.content.substring(0, 30) : "내용 없음";

    li.innerHTML = `
      <div class="note-menu-title">${note.title || "제목 없음"}</div>
      <div class="note-menu-desc">${excerpt}</div>
    `;

    // 메모 클릭 시 해당 메모 내용 로딩
    li.addEventListener('click', () => {
      selectNote(note.id);
    });

    notesList.appendChild(li);
  });
}

/**
 * 새로운 메모를 작성하기 위한 에디터 빈 상태로 전환
 */
function createNewNoteState() {
  noteEditorEmpty.classList.add('hidden');
  noteEditorForm.classList.remove('hidden');
  
  noteEditIdInput.value = "";
  noteTitleInput.value = "";
  noteContentInput.value = "";
  noteSavedTime.textContent = "새 메모 작성 중";

  // 신규 작성 시 삭제 버튼 비활성화 (저장 전에는 삭제할 게 없으므로)
  noteDeleteBtn.classList.add('hidden');

  // 리스트의 하이라이트 초기화
  renderNotesList();
}

/**
 * 메모 리스트에서 하나를 클릭하여 선택했을 때
 */
function selectNote(noteId) {
  const note = appData.notes.find(n => n.id === noteId.toString());
  if (!note) return;

  noteEditorEmpty.classList.add('hidden');
  noteEditorForm.classList.remove('hidden');

  noteEditIdInput.value = note.id;
  noteTitleInput.value = note.title || "";
  noteContentInput.value = note.content || "";
  noteSavedTime.textContent = `최근 수정: ${note.updatedAt}`;

  // 기존 메모이므로 삭제 버튼 표시
  noteDeleteBtn.classList.remove('hidden');

  // 사이드바 하이라이트 갱신
  renderNotesList();
}

/**
 * 메모 저장하기
 */
function handleNoteSave() {
  const id = noteEditIdInput.value;
  const title = noteTitleInput.value.trim();
  const content = noteContentInput.value;

  if (!title && !content) {
    alert("제목 또는 내용을 입력해주세요.");
    return;
  }

  const nowString = getFormattedDateTime(new Date());

  if (id) {
    // 기존 메모 수정
    const noteIndex = appData.notes.findIndex(n => n.id === id);
    if (noteIndex > -1) {
      appData.notes[noteIndex].title = title || "제목 없음";
      appData.notes[noteIndex].content = content;
      appData.notes[noteIndex].updatedAt = nowString;
    }
  } else {
    // 새 메모 저장
    const newNote = {
      id: Date.now().toString(),
      title: title || "제목 없음",
      content: content,
      updatedAt: nowString
    };
    appData.notes.push(newNote);
    // 방금 저장된 새로운 메모의 ID로 에디터 상태 설정
    noteEditIdInput.value = newNote.id;
    noteDeleteBtn.classList.remove('hidden');
  }

  saveAllData();
  // 에디터 하단 시간 갱신
  noteSavedTime.textContent = `최근 저장: ${nowString}`;
}

/**
 * 현재 보고 있는 메모 삭제하기
 */
function handleNoteDelete() {
  const id = noteEditIdInput.value;
  if (!id) return;

  if (confirm("이 메모를 정말 삭제하시겠습니까?")) {
    appData.notes = appData.notes.filter(n => n.id !== id);
    
    // 에디터 닫고 초기화 상태로 복구
    noteEditIdInput.value = "";
    noteEditorForm.classList.add('hidden');
    noteEditorEmpty.classList.remove('hidden');

    saveAllData();
  }
}


// ==========================================================================
// 10. 일기장 관리 (Diary & Calendar Section)
// ==========================================================================

/**
 * 달력 이전/다음 달 이동
 * @param {number} direction -1(이전달), 1(다음달)
 */
function navigateMonth(direction) {
  calendarMonth += direction;
  
  // 12월을 넘어갔을 경우 연도 갱신
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }
  // 1월 이전으로 갔을 경우 연도 갱신
  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }

  renderCalendar();
}

/**
 * 달력을 렌더링하고 일기가 적힌 날짜에 표식을 칠합니다.
 */
function renderCalendar() {
  calendarDaysGrid.innerHTML = "";
  
  // 연/월 타이틀 갱신
  calendarMonthYear.textContent = `${calendarYear}년 ${calendarMonth + 1}월`;

  // 이번 달의 1일 날짜 객체
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
  // 이번 달 1일이 시작하는 요일 (0: 일요일, 6: 토요일)
  const startDayOfWeek = firstDayOfMonth.getDay();
  // 이번 달의 총 일수 계산 (다음 달 0일째 날짜는 이번 달 마지막 날)
  const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  // 1. 1일 시작 전 빈 칸 채우기
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = "calendar-day empty";
    calendarDaysGrid.appendChild(emptyCell);
  }

  // 오늘 날짜 정보 구하기
  const todayObj = new Date();
  const todayStr = getFormattedDate(todayObj);

  // 2. 날짜 채우기
  for (let day = 1; day <= totalDays; day++) {
    const dayCell = document.createElement('div');
    dayCell.className = "calendar-day";
    dayCell.textContent = day;

    // YYYY-MM-DD 키 형식 문자열 생성
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 해당 날짜에 일기 데이터가 존재하는 경우 배지 마커 클래스 부여
    if (appData.diaries && appData.diaries[dateStr]) {
      dayCell.classList.add('has-diary');
    }

    // 오늘 날짜 테두리 강조 표시
    if (dateStr === todayStr) {
      dayCell.classList.add('today');
    }

    // 현재 선택된 날짜 배경 강조 표시
    if (dateStr === selectedDiaryDate) {
      dayCell.classList.add('selected');
    }

    // 날짜 클릭 이벤트
    dayCell.addEventListener('click', () => {
      // 이전 선택된 셀들에서 selected 클래스 제거
      const prevSelected = calendarDaysGrid.querySelector('.calendar-day.selected');
      if (prevSelected) prevSelected.classList.remove('selected');

      // 현재 셀을 선택 상태로 설정
      dayCell.classList.add('selected');
      selectedDiaryDate = dateStr;

      // 우측 일기 입력 에디터 패널 업데이트
      updateDiarySection();
    });

    calendarDaysGrid.appendChild(dayCell);
  }
}

/**
 * 선택한 날짜에 맞춰 일기 입력창 및 상태를 갱신합니다.
 */
function updateDiarySection() {
  if (!selectedDiaryDate) {
    selectedDateTitle.textContent = "달력에서 날짜를 선택해 주세요.";
    diaryFormContainer.classList.add('hidden');
    diaryEmptyMessage.classList.remove('hidden');
    return;
  }

  // 상단 제목 갱신
  selectedDateTitle.textContent = `📅 ${selectedDiaryDate} 일기`;
  diaryFormContainer.classList.remove('hidden');
  diaryEmptyMessage.classList.add('hidden');

  // 해당 일자 일기가 존재하는지 확인
  const existingDiary = appData.diaries[selectedDiaryDate];

  if (existingDiary) {
    diaryContentInput.value = existingDiary;
    diarySaveBtn.textContent = "일기 수정";
    diaryDeleteBtn.classList.remove('hidden');
  } else {
    diaryContentInput.value = "";
    diarySaveBtn.textContent = "일기 저장";
    diaryDeleteBtn.classList.add('hidden');
  }
}

/**
 * 일기 저장 핸들러
 */
function handleDiarySave() {
  if (!selectedDiaryDate) return;

  const content = diaryContentInput.value.trim();

  if (!content) {
    alert("일기 내용을 입력해주세요.");
    return;
  }

  // 일기 데이터 등록/수정
  appData.diaries[selectedDiaryDate] = content;

  saveAllData();
  alert(`${selectedDiaryDate} 일기가 성공적으로 저장되었습니다.`);
  
  // 달력 및 우측 폼 갱신
  renderCalendar();
  updateDiarySection();
}

/**
 * 일기 삭제 핸들러
 */
function handleDiaryDelete() {
  if (!selectedDiaryDate) return;

  if (confirm(`${selectedDiaryDate} 일기를 정말 삭제하시겠습니까?`)) {
    // 키 삭제
    delete appData.diaries[selectedDiaryDate];
    
    saveAllData();
    
    // 달력 및 우측 폼 갱신
    renderCalendar();
    updateDiarySection();
  }
}


// ==========================================================================
// 11. 통합 검색 구현 (Global Search Section)
// ==========================================================================
function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    searchEmptyState.classList.remove('hidden');
    searchResultsContent.classList.add('hidden');
    return;
  }

  // 검색 기본 UI 토글
  searchEmptyState.classList.add('hidden');
  searchResultsContent.classList.remove('hidden');

  // 결과 영역 초기화
  searchTodoList.innerHTML = "";
  searchNotesList.innerHTML = "";
  searchDiaryList.innerHTML = "";

  let todoResultsCount = 0;
  let notesResultsCount = 0;
  let diaryResultsCount = 0;

  // 11-A. To-Do 검색
  const matchedTodos = appData.todos.filter(t => t.title.toLowerCase().includes(query));
  todoResultsCount = matchedTodos.length;
  countTodoEl.textContent = todoResultsCount;

  if (todoResultsCount === 0) {
    searchTodoList.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--text-muted);">검색 결과가 없습니다.</div>`;
  } else {
    matchedTodos.forEach(todo => {
      const card = document.createElement('div');
      card.className = "search-result-card";
      
      const priorityLabel = todo.priority === 'high' ? '상' : (todo.priority === 'medium' ? '중' : '하');
      const isCompleted = todo.completed ? '완료됨' : '진행중';

      card.innerHTML = `
        <div class="search-result-title">${todo.title}</div>
        <div class="search-result-excerpt">마감일: ${todo.date} / 우선순위: ${priorityLabel} [${isCompleted}]</div>
        <div class="search-result-meta">📌 할 일 바로가기</div>
      `;

      // 클릭 시 해당 탭으로 이동하고 해당 할 일을 편집 폼으로 로딩
      card.addEventListener('click', () => {
        switchTab('todo');
        startEditTodo(todo);
      });
      searchTodoList.appendChild(card);
    });
  }

  // 11-B. 메모 검색
  const matchedNotes = appData.notes.filter(n => 
    n.title.toLowerCase().includes(query) || 
    n.content.toLowerCase().includes(query)
  );
  notesResultsCount = matchedNotes.length;
  countNotesEl.textContent = notesResultsCount;

  if (notesResultsCount === 0) {
    searchNotesList.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--text-muted);">검색 결과가 없습니다.</div>`;
  } else {
    matchedNotes.forEach(note => {
      const card = document.createElement('div');
      card.className = "search-result-card";
      
      const contentExcerpt = note.content ? note.content.substring(0, 60) + "..." : "내용 없음";

      card.innerHTML = `
        <div class="search-result-title">${note.title}</div>
        <div class="search-result-excerpt">${contentExcerpt}</div>
        <div class="search-result-meta">최근 수정일: ${note.updatedAt}</div>
      `;

      // 클릭 시 메모 탭으로 이동하고 메모 선택
      card.addEventListener('click', () => {
        switchTab('notes');
        selectNote(note.id);
      });
      searchNotesList.appendChild(card);
    });
  }

  // 11-C. 일기 검색
  const matchedDiaries = [];
  for (const [date, content] of Object.entries(appData.diaries)) {
    if (content.toLowerCase().includes(query) || date.includes(query)) {
      matchedDiaries.push({ date, content });
    }
  }
  diaryResultsCount = matchedDiaries.length;
  countDiaryEl.textContent = diaryResultsCount;

  if (diaryResultsCount === 0) {
    searchDiaryList.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--text-muted);">검색 결과가 없습니다.</div>`;
  } else {
    matchedDiaries.forEach(diary => {
      const card = document.createElement('div');
      card.className = "search-result-card";
      
      const contentExcerpt = diary.content.substring(0, 60) + "...";

      card.innerHTML = `
        <div class="search-result-title">${diary.date} 일기</div>
        <div class="search-result-excerpt">${contentExcerpt}</div>
        <div class="search-result-meta">📅 일기장 바로가기</div>
      `;

      // 클릭 시 일기 탭으로 이동하고 해당 일자로 달력 이동 후 선택
      card.addEventListener('click', () => {
        const [year, month, day] = diary.date.split('-').map(Number);
        calendarYear = year;
        calendarMonth = month - 1; // Month는 0부터 시작하므로
        selectedDiaryDate = diary.date;
        
        switchTab('diary');
      });
      searchDiaryList.appendChild(card);
    });
  }
}
