(() => {
  "use strict";

  const STORAGE_KEY = "aperion.frontend.v1";
  const SIDEBAR_KEY = "aperion.frontend.sidebarCollapsed";

  // Curated, Apple-like project color palette (used by the color picker).
  // A user picks one of these with a click, or opens the native color input
  // for a fully custom color — no hex codes to type.
  const PROJECT_COLORS = ["#0071e3","#5856d6","#ff2d55","#ff3b30","#ff9500","#ffcc00","#34c759","#30b0c7","#5e5ce6","#8e8e93"];

  const DEFAULT_DATA = {
    appearance: "system",
    notifications: "off",
    recentSearches: [],
    projects: [
      {
        id: "p-university", name: "University", description: "Everything for university.",
        color: "#0071e3", icon: "U", favorite: true, parentId: null, order: 0
      },
      {
        id: "p-aperion", name: "Build Aperion", description: "Design, build and refine Aperion.",
        color: "#5856d6", icon: "A", favorite: true, parentId: null, order: 1
      },
      {
        id: "p-personal", name: "Personal", description: "Personal goals and tasks.",
        color: "#34c759", icon: "P", favorite: false, parentId: null, order: 2
      }
    ],
    tasks: [
      { id:"t1", title:"Finish SQL assignment", notes:"Complete the joins and window functions.", completed:false, priority:"high", favorite:true, projectId:"p-university", parentTaskId:null, order:0, createdAt:Date.now()-500000, links:[] },
      { id:"t2", title:"Review data structures", notes:"Focus on trees and graph traversal.", completed:false, priority:"medium", favorite:false, projectId:"p-university", parentTaskId:null, order:1, createdAt:Date.now()-400000, links:[] },
      { id:"t3", title:"Refine Aperion sidebar", notes:"Keep it compact and native-looking.", completed:false, priority:"medium", favorite:true, projectId:"p-aperion", parentTaskId:null, order:0, createdAt:Date.now()-300000, links:[] },
      { id:"t4", title:"Validate task deletion flow", notes:"Test Recently Deleted and undo.", completed:true, priority:null, favorite:false, projectId:"p-aperion", parentTaskId:null, order:0, createdAt:Date.now()-200000, links:[] },
      { id:"t5", title:"Read 20 pages", notes:"", completed:false, priority:"low", favorite:false, projectId:null, parentTaskId:null, order:0, createdAt:Date.now()-100000, links:[] }
    ],
    deleted: []
  };

  const ICONS = {
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    star: '<path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8L6.7 19.6l1-6L3.3 9.4l6-.9z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 14h10l1-14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M4.9 6.3l1.4 1.4M17.7 16.3l1.4 1.4M3 12h2M19 12h2M4.9 17.7l1.4-1.4M17.7 7.7l1.4-1.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    restore: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 5v5h5"/>',
    more: '<circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none"/>'
  };

  function icon(name, filled = false) {
    const path = ICONS[name];
    if (!path) return "";
    const fill = filled ? "currentColor" : "none";
    const starExtra = name === "star" && filled ? ' fill="currentColor"' : "";
    return `<svg class="icon-svg" viewBox="0 0 24 24" fill="${name === "star" && filled ? "currentColor" : fill}" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${starExtra}>${path}</svg>`;
  }

  const state = {
    data: loadData(),
    view: "all",
    selectedProjectId: null,
    searchQuery: "",
    editingTaskId: null,
    lastAction: null,
    focusedTaskId: null,
    lastViewKey: null,
    completedOpen: false,
    sidebarOpen: false,
    sidebarCollapsed: loadSidebarCollapsed()
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_DATA);
      const parsed = JSON.parse(raw);
      return {
        ...clone(DEFAULT_DATA),
        ...parsed,
        projects: parsed.projects || clone(DEFAULT_DATA.projects),
        tasks: parsed.tasks || clone(DEFAULT_DATA.tasks),
        deleted: parsed.deleted || []
      };
    } catch { return clone(DEFAULT_DATA); }
  }

  function loadSidebarCollapsed() {
    try { return localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function projectById(id) { return state.data.projects.find(p => p.id === id); }
  function activeTasks() { return state.data.tasks.filter(t => !t.deleted); }
  function topLevelTasks() { return activeTasks().filter(t => !t.parentTaskId); }

  function taskCount() { return topLevelTasks().filter(t => !t.completed).length; }
  function favoriteCount() { return topLevelTasks().filter(t => t.favorite).length; }
  function deletedCount() { return state.data.deleted.length; }

  function projectTasks(projectId) {
    return topLevelTasks().filter(t => t.projectId === projectId);
  }

  function viewKey() {
    return state.selectedProjectId ? `project:${state.selectedProjectId}` : state.view;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function highlightMatch(text, query) {
    const escaped = escapeHtml(text);
    const q = (query || "").trim();
    if (!q) return escaped;
    const escapedQuery = escapeHtml(q);
    const idx = escaped.toLowerCase().indexOf(escapedQuery.toLowerCase());
    if (idx < 0) return escaped;
    return escaped.slice(0, idx) + `<mark>${escaped.slice(idx, idx + escapedQuery.length)}</mark>` + escaped.slice(idx + escapedQuery.length);
  }

  // Priority is communicated purely by color — a small, restrained dot —
  // rather than a P1/P2/P3 text badge.
  function priorityHTML(priority) {
    if (!priority) return "";
    const label = priority === "high" ? "High priority" : priority === "medium" ? "Medium priority" : "Low priority";
    return `<span class="priority-dot ${priority}" title="${label}" aria-label="${label}"></span>`;
  }

  function hydrateIcons(root = document) {
    $$("[data-icon]", root).forEach(el => {
      el.innerHTML = icon(el.dataset.icon, el.dataset.filled === "true");
    });
  }

  function closeSidebar() {
    state.sidebarOpen = false;
    $("#app").classList.remove("sidebar-open");
    $("#sidebarBackdrop").hidden = true;
  }

  function openSidebar() {
    state.sidebarOpen = true;
    $("#app").classList.add("sidebar-open");
    $("#sidebarBackdrop").hidden = false;
  }

  // The sidebar toggle button now works at any window size, not just inside
  // the narrow mobile breakpoint. Below that breakpoint it keeps using the
  // existing slide-in drawer (openSidebar/closeSidebar above); at any wider
  // size it now toggles a persistent, collapsed-to-zero-width state instead,
  // so the same button always does something visible.
  function applySidebarCollapsed() {
    document.documentElement.classList.toggle("sidebar-collapsed", !!state.sidebarCollapsed);
  }

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 620px)").matches) {
      state.sidebarOpen ? closeSidebar() : openSidebar();
      return;
    }
    state.sidebarCollapsed = !state.sidebarCollapsed;
    try { localStorage.setItem(SIDEBAR_KEY, state.sidebarCollapsed ? "1" : "0"); } catch {}
    applySidebarCollapsed();
  }

  function render(options = {}) {
    const animateView = options.animateView !== false;
    const nextKey = viewKey();
    const viewChanged = nextKey !== state.lastViewKey;
    state.lastViewKey = nextKey;
    renderSidebar();
    renderHeader();
    renderContent(animateView && viewChanged);
    hydrateIcons();
    bindGlobalInteractions();
  }

  function renderSidebar() {
    $("#allCount").textContent = taskCount() || "";
    $("#favoriteCount").textContent = favoriteCount() || "";
    $("#deletedCount").textContent = deletedCount() || "";

    $$(".nav-item").forEach(btn => {
      btn.classList.toggle("active", state.view === btn.dataset.view && !state.selectedProjectId);
    });

    const container = $("#projectNav");
    const roots = state.data.projects.filter(p => !p.parentId).sort((a,b) => a.order-b.order);
    container.innerHTML = roots.map(project => {
      const active = state.selectedProjectId === project.id;
      const children = state.data.projects.filter(p => p.parentId === project.id).sort((a,b)=>a.order-b.order);
      return `
        <button class="project-row ${active ? "active" : ""}" data-project="${project.id}">
          <span class="project-dot" style="background:${escapeHtml(project.color)}"></span>
          <span>${escapeHtml(project.name)}</span>
          <span class="chevron">${children.length ? "›" : ""}</span>
        </button>
        ${active ? children.map(child => `
          <button class="project-row subproject-row ${state.selectedProjectId===child.id ? "active":""}" data-project="${child.id}">
            <span class="project-dot" style="background:${escapeHtml(child.color)}"></span>
            <span>${escapeHtml(child.name)}</span>
          </button>`).join("") : ""}
      `;
    }).join("");
  }

  function renderHeader() {
    const project = state.selectedProjectId ? projectById(state.selectedProjectId) : null;
    const titles = { all:"All Tasks", favorites:"Favorites", search:"Search", deleted:"Recently Deleted", settings:"Settings" };
    const title = project ? project.name : (titles[state.view] || "All Tasks");
    let kicker = "";
    if (project) {
      const n = projectTasks(project.id).filter(t => !t.completed).length;
      kicker = `${n} open`;
    } else if (state.view === "all") {
      kicker = `${taskCount()} open`;
    } else if (state.view === "favorites") {
      kicker = `${favoriteCount()} starred`;
    } else if (state.view === "deleted") {
      kicker = deletedCount() ? `${deletedCount()} recoverable` : "";
    }
    $("#viewTitle").textContent = title;
    $("#viewKicker").textContent = kicker;
    const pip = $("#titlePip");
    if (project) {
      pip.hidden = false;
      pip.style.background = project.color;
    } else {
      pip.hidden = true;
    }
  }

  function renderContent(animate) {
    const root = $("#content");
    if (state.selectedProjectId) {
      root.innerHTML = renderProjectView(projectById(state.selectedProjectId));
    } else if (state.view === "settings") {
      root.innerHTML = renderSettings();
    } else if (state.view === "search") {
      root.innerHTML = renderSearchPage();
    } else if (state.view === "deleted") {
      root.innerHTML = renderDeleted();
    } else if (state.view === "favorites") {
      root.innerHTML = renderFavorites();
    } else {
      root.innerHTML = renderAllTasks();
    }
    const inner = $(".content-inner", root);
    if (inner && animate) {
      inner.classList.remove("view-enter");
      void inner.offsetWidth;
      inner.classList.add("view-enter");
    }
  }

  function taskRow(task) {
    const project = projectById(task.projectId);
    const subtasks = state.data.tasks.filter(t => t.parentTaskId === task.id);
    const subtaskBadge = subtasks.length
      ? `<span class="subtask-progress" title="${subtasks.filter(s=>s.completed).length} of ${subtasks.length} subtasks done">${subtasks.filter(s=>s.completed).length}/${subtasks.length}</span>`
      : "";
    return `
      <div class="task-row ${task.completed ? "completed" : ""} ${state.focusedTaskId === task.id ? "focused" : ""}" draggable="true" data-task-id="${task.id}">
        <button class="check ${task.completed ? "done" : ""}" data-complete="${task.id}" aria-label="Toggle completion" aria-pressed="${task.completed}"></button>
        <div class="task-main" data-open-task="${task.id}">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">
            ${priorityHTML(task.priority)}
            ${subtaskBadge}
            ${task.notes ? `<span>${escapeHtml(task.notes.slice(0,70))}</span>` : ""}
            ${project && !state.selectedProjectId ? `<span>${escapeHtml(project.name)}</span>` : ""}
          </div>
        </div>
        <div class="task-actions">
          <button class="star ${task.favorite ? "active" : ""}" data-favorite="${task.id}" title="Favorite" aria-pressed="${task.favorite}">${icon("star", task.favorite)}</button>
        </div>
      </div>`;
  }

  function groupedList(tasks) {
    if (!tasks.length) return "";
    return `<div class="task-list grouped">${tasks.map(taskRow).join("")}</div>`;
  }

  function quickAddHTML() {
    return `<form class="quick-add" id="quickAdd">
      <span class="check" aria-hidden="true"></span>
      <input id="quickAddInput" placeholder="New task" autocomplete="off" aria-label="New task">
    </form>`;
  }

  function completedBlock(completed) {
    if (!completed.length) return "";
    return `<div class="section-block">
      <button class="section-heading completed-toggle" type="button" id="completedToggle" aria-expanded="${state.completedOpen}">
        <span class="disclosure ${state.completedOpen ? "open" : ""}"></span>
        <span>Completed</span>
        <span class="section-count">${completed.length}</span>
      </button>
      ${state.completedOpen ? groupedList(completed.sort((a,b)=>(b.completedAt||0)-(a.completedAt||0))) : ""}
    </div>`;
  }

  function renderTaskGroups(tasks) {
    const groups = new Map();
    tasks.sort((a,b) => a.order-b.order).forEach(t => {
      const project = projectById(t.projectId);
      const key = t.projectId || "unassigned";
      const title = project?.name || "Inbox";
      if (!groups.has(key)) groups.set(key, {title, projectId:t.projectId, tasks:[]});
      groups.get(key).tasks.push(t);
    });

    return [...groups.values()].map(group => `
      <div class="section-block">
        <div class="section-heading"><span>${escapeHtml(group.title)}</span><span class="section-count">${group.tasks.length}</span></div>
        ${groupedList(group.tasks)}
      </div>`).join("");
  }

  function renderAllTasks() {
    const tasks = topLevelTasks().filter(t => !t.completed);
    const completed = topLevelTasks().filter(t => t.completed);
    return `<div class="content-inner">
      ${quickAddHTML()}
      ${tasks.length ? renderTaskGroups(tasks) : emptyState("Nothing left to do", "Type above to add something.")}
      ${completedBlock(completed)}
    </div>`;
  }

  function renderFavorites() {
    const tasks = topLevelTasks().filter(t => t.favorite).sort((a,b)=>a.order-b.order);
    const projects = state.data.projects.filter(p => p.favorite);
    return `<div class="content-inner">
      ${projects.length ? `<div class="section-block"><div class="section-heading"><span>Projects</span></div>${projects.map(p=>`
        <div class="subproject-card" data-project="${p.id}">
          <strong>${escapeHtml(p.name)}</strong><div class="task-meta">${projectTasks(p.id).filter(t=>!t.completed).length} open</div>
        </div>`).join("")}</div>`:""}
      ${tasks.length ? `<div class="section-block"><div class="section-heading"><span>Tasks</span><span class="section-count">${tasks.length}</span></div>${groupedList(tasks)}</div>` : emptyState("No favorites yet", "Star a task and it will appear here.", true)}
    </div>`;
  }

  function renderProjectView(project) {
    if (!project) return `<div class="content-inner">${emptyState("Project not found", "The selected project no longer exists.")}</div>`;
    const tasks = projectTasks(project.id);
    const children = state.data.projects.filter(p=>p.parentId===project.id);
    const completed = tasks.filter(t => t.completed);
    const openTasks = tasks.filter(t => !t.completed).sort((a,b)=>a.order-b.order);
    return `<div class="content-inner">
      <div class="project-header">
        ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ""}
        <div class="project-actions">
          <button class="icon-button" data-edit-project="${project.id}" title="Edit project" aria-label="Edit project">${icon("more")}</button>
        </div>
      </div>
      ${quickAddHTML()}
      ${children.length ? `<div class="section-block"><div class="section-heading"><span>Sub-projects</span></div>${children.map(c=>`<div class="subproject-card" data-project="${c.id}"><strong>${escapeHtml(c.name)}</strong><div class="task-meta">${projectTasks(c.id).filter(t=>!t.completed).length} open</div></div>`).join("")}</div>` : ""}
      ${openTasks.length ? groupedList(openTasks) : `<div class="subproject-card" data-action="new-task">Add a task</div>`}
      ${completedBlock(completed)}
    </div>`;
  }

  function renderSearchPage() {
    return `<div class="content-inner">
      <div class="search-page-field">
        ${icon("search")}
        <input id="pageSearch" value="${escapeHtml(state.searchQuery)}" placeholder="Search Aperion" autofocus>
      </div>
      <div id="pageSearchResults">${renderSearchResults(state.searchQuery)}</div>
    </div>`;
  }

  function renderSearchResults(query) {
    if (!query.trim()) {
      const recent = state.data.recentSearches || [];
      return recent.length ? `<div class="section-heading"><span>Recent</span></div>${recent.map(s=>`
        <div class="recent-search-row">
          <button class="search-result" data-recent-search="${escapeHtml(s)}"><span class="result-kind">Recent</span><div class="result-title">${escapeHtml(s)}</div></button>
          <button class="remove-recent" data-remove-recent="${escapeHtml(s)}" title="Remove from recent searches" aria-label="Remove ‘${escapeHtml(s)}’ from recent searches">${icon("close")}</button>
        </div>`).join("")}` : emptyState("Search Aperion", "Find tasks, projects and notes.");
    }
    const q = query.trim().toLowerCase();
    const taskResults = [], projectResults = [];
    activeTasks().forEach(t => {
      if ([t.title,t.notes].some(v=>(v||"").toLowerCase().includes(q))) {
        taskResults.push({
          kind: t.parentTaskId ? "Subtask" : "Task",
          title: t.title,
          detail: projectById(t.projectId)?.name || "Inbox",
          task: t
        });
      }
    });
    state.data.projects.forEach(p => {
      if (p.name.toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q)) projectResults.push({kind:"Project",title:p.name,detail:p.description||"",project:p});
    });
    const groups = [
      { label: "Tasks", results: taskResults },
      { label: "Projects", results: projectResults }
    ].filter(g => g.results.length);
    if (!groups.length) return emptyState("No matches", "Try another word or a task title.");
    return groups.map(g => `
      <div class="section-heading"><span>${g.label}</span><span class="section-count">${g.results.length}</span></div>
      ${g.results.map(r=>`<button class="search-result" data-result-kind="${r.kind}" data-result-id="${r.task?.id || r.project?.id || ""}">
        <span class="result-kind">${r.kind}</span>
        <div><div class="result-title">${highlightMatch(r.title, query)}</div>${r.detail ? `<div class="result-detail">${highlightMatch(r.detail, query)}</div>` : ""}</div>
      </button>`).join("")}`).join("");
  }

  function renderDeleted() {
    const items = state.data.deleted;
    return `<div class="content-inner">
      <div class="view-intro">
        ${items.length ? `<button class="add-inline" data-action="empty-trash">Empty</button>` : ""}
      </div>
      ${items.length ? `<div class="task-list grouped">${items.map(item => `<div class="task-row">
        <div class="check"></div><div class="task-main"><div class="task-title">${escapeHtml(item.title || item.name)}</div><div class="task-meta">Deleted ${formatRelative(item.deletedAt)}</div></div>
        <div class="task-actions" style="opacity:1">
          <button class="star" data-restore="${item.id}" title="Restore">${icon("restore")}</button>
          <button class="star" data-permanent-delete="${item.id}" title="Delete permanently">${icon("trash")}</button>
        </div>
      </div>`).join("")}</div>` : emptyState("Nothing here", "Deleted tasks will appear in this list.")}
    </div>`;
  }

  function renderSettings() {
    return `<div class="content-inner">
      <div class="settings-grid">
        <div class="setting-card">
          <div class="setting-title">Appearance</div>
          <div class="setting-description">Match the system, or lock light or dark.</div>
          <div class="setting-row"><span>Theme</span><select class="select" id="appearanceSelect"><option value="system" ${state.data.appearance==="system"?"selected":""}>System</option><option value="light" ${state.data.appearance==="light"?"selected":""}>Light</option><option value="dark" ${state.data.appearance==="dark"?"selected":""}>Dark</option></select></div>
        </div>
        <div class="setting-card">
          <div class="setting-title">Notifications</div>
          <div class="setting-description">A single reminder about tasks still open.</div>
          <div class="setting-row"><span>Remind me</span><select class="select" id="notificationSelect"><option value="off" ${state.data.notifications==="off"?"selected":""}>Off</option><option value="daily" ${state.data.notifications==="daily"?"selected":""}>Once a day</option><option value="weekdays" ${state.data.notifications==="weekdays"?"selected":""}>Weekdays only</option></select></div>
        </div>
        <div class="setting-card">
          <div class="setting-title">Local storage</div>
          <div class="setting-description">This prototype stores state in the browser. The final app will use SwiftData.</div>
          <div class="setting-row"><span>Prototype data</span><button class="primary-action" id="resetData">Reset demo data</button></div>
        </div>
        <div class="setting-card">
          <div class="setting-title">Privacy</div>
          <div class="setting-description">No account, backend, analytics or cloud service is used by this prototype.</div>
        </div>
      </div>
    </div>`;
  }

  function emptyState(title, description, withAction = false) {
    return `<div class="empty-state"><div><h2>${title}</h2><p>${description}</p>${withAction ? `<button class="primary-action" data-action="new-task">New task</button>` : ""}</div></div>`;
  }

  function formatRelative(ts) {
    const days = Math.max(0, Math.floor((Date.now()-ts)/86400000));
    return days === 0 ? "today" : `${days} day${days===1?"":"s"} ago`;
  }

  function openOverlay(el) { el.classList.add("is-open"); }
  function closeOverlay(el) { el.classList.remove("is-open"); }

  function openTaskModal(taskId = null) {
    state.editingTaskId = taskId;
    const task = taskId ? state.data.tasks.find(t=>t.id===taskId) : {
      id:null,title:"",notes:"",completed:false,priority:null,favorite:false,projectId:state.selectedProjectId,parentTaskId:null,order:999,createdAt:Date.now(),links:[]
    };
    if (!task) return;
    const subtasks = state.data.tasks.filter(t=>t.parentTaskId===task.id);

    $("#taskModal").innerHTML = `
      <div class="modal-header">
        <input class="modal-title-input" id="modalTitle" value="${escapeHtml(task.title)}" placeholder="Title" autofocus>
        <button class="close-button" id="closeModal" aria-label="Close">${icon("close")}</button>
      </div>
      <textarea class="notes-field" id="modalNotes" rows="4" placeholder="Notes">${escapeHtml(task.notes||"")}</textarea>
      <div class="meta-row">
        <label class="meta-field"><span>Priority</span>
          <select id="modalPriority"><option value="">None</option><option value="high" ${task.priority==="high"?"selected":""}>High</option><option value="medium" ${task.priority==="medium"?"selected":""}>Medium</option><option value="low" ${task.priority==="low"?"selected":""}>Low</option></select>
        </label>
        <label class="meta-field"><span>Project</span>
          <select id="modalProject"><option value="">Inbox</option>${state.data.projects.map(p=>`<option value="${p.id}" ${task.projectId===p.id?"selected":""}>${escapeHtml(p.name)}</option>`).join("")}</select>
        </label>
      </div>
      ${taskId ? `<div class="subtasks"><div class="section-heading" style="padding:0 0 4px"><span>Subtasks</span></div>${subtasks.map(s=>`<div class="subtask-line"><button class="check ${s.completed?"done":""}" data-complete="${s.id}"></button><input type="text" value="${escapeHtml(s.title)}" data-subtask-input="${s.id}"></div>`).join("")}<div class="subtask-line"><button class="check"></button><input type="text" id="newSubtask" placeholder="New subtask"></div></div>` : ""}
      <div class="modal-footer">
        <button class="danger-button" id="deleteTaskModal">${taskId ? "Delete" : ""}</button>
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
          <button class="icon-button" id="favoriteModal" aria-label="Favorite">${icon("star", task.favorite)}</button>
          <button class="save-button" id="saveTaskModal">Done</button>
        </div>
      </div>`;
    openOverlay($("#modalBackdrop"));

    $("#closeModal").onclick = closeModal;
    $("#saveTaskModal").onclick = () => saveTaskFromModal(task);
    $("#deleteTaskModal").onclick = () => { if(taskId) { deleteTask(taskId); closeModal(); } };
    $("#favoriteModal").onclick = () => {
      task.favorite = !task.favorite;
      $("#favoriteModal").innerHTML = icon("star", task.favorite);
      $("#favoriteModal").classList.toggle("pop", true);
    };
    $$(".check", $("#taskModal")).forEach(btn => {
      if (btn.dataset.complete) btn.onclick = () => toggleComplete(btn.dataset.complete);
    });
    $("#modalTitle").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); saveTaskFromModal(task); } };
    $("#modalTitle").addEventListener("input", () => $("#modalTitle").classList.remove("field-error"));
    $("#newSubtask")?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); saveTaskFromModal(task); } });
  }

  function saveTaskFromModal(existing) {
    const title = $("#modalTitle").value.trim();
    if (!title) {
      const input = $("#modalTitle");
      input.classList.remove("field-error");
      void input.offsetWidth;
      input.classList.add("field-error");
      input.focus();
      return;
    }

    const projectId = $("#modalProject").value || null;
    // Links intentionally aren't exposed in this form anymore — omitting the
    // key here means an existing task's links (if any) are left untouched,
    // and new tasks keep the empty links[] from their template. This keeps
    // the data model forward-compatible if the field comes back later.
    const payload = {
      title,
      notes: $("#modalNotes").value.trim(),
      priority: $("#modalPriority").value || null,
      projectId,
    };

    if (existing.id) {
      Object.assign(existing, payload);
      const subtaskInput = $$(".subtask-line input[data-subtask-input]", $("#taskModal"));
      subtaskInput.forEach(input => {
        const sub = state.data.tasks.find(t=>t.id===input.dataset.subtaskInput);
        if(sub) sub.title = input.value.trim() || sub.title;
      });
      const newSub = $("#newSubtask")?.value.trim();
      if (newSub) state.data.tasks.push({id:uid("task"),title:newSub,notes:"",completed:false,priority:null,favorite:false,projectId,parentTaskId:existing.id,order:999,createdAt:Date.now()});
    } else {
      state.data.tasks.push({...existing,...payload,id:uid("task"),createdAt:Date.now()});
    }
    persist(); closeModal(); render({ animateView: false }); showToast(existing.id ? "Task updated" : "Task created");
  }

  function closeModal() {
    closeOverlay($("#modalBackdrop"));
    state.editingTaskId = null;
  }

  function createQuickTask(title) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const projectId = state.selectedProjectId;
    const siblings = topLevelTasks().filter(t => t.projectId === (projectId || null));
    const order = siblings.length ? Math.min(...siblings.map(t => t.order)) - 1 : 0;
    state.data.tasks.push({
      id: uid("task"), title: trimmed, notes: "", completed: false, priority: null, favorite: false,
      projectId: projectId || null, parentTaskId: null, order, createdAt: Date.now(), links: []
    });
    persist();
    render({ animateView: false });
    showToast("Task created");
    $("#quickAddInput")?.focus();
  }

  function toggleComplete(id) {
    const task = state.data.tasks.find(t=>t.id===id);
    if (!task) return;
    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;
    persist(); render({ animateView: false }); showToast(task.completed ? "Task completed" : "Task reopened");
  }

  function toggleFavorite(id) {
    const task = state.data.tasks.find(t=>t.id===id);
    if (!task) return;
    task.favorite = !task.favorite;
    persist(); render({ animateView: false });
    const btn = $(`.star[data-favorite="${id}"]`);
    if (btn) { btn.classList.add("pop"); }
  }

  function deleteTask(id) {
    const index = state.data.tasks.findIndex(t=>t.id===id);
    if(index<0) return;
    const task = state.data.tasks[index];
    state.data.tasks.splice(index,1);
    state.data.deleted.unshift({...task,deletedAt:Date.now(),type:"task"});
    state.lastAction = {type:"restoreTask", task:clone(task)};
    if (state.focusedTaskId === id) state.focusedTaskId = null;
    persist(); render({ animateView: false }); showToast("Moved to Recently Deleted", true);
  }

  function restoreItem(id) {
    const index = state.data.deleted.findIndex(x=>x.id===id);
    if(index<0) return;
    const item = state.data.deleted[index];
    state.data.deleted.splice(index,1);
    if(item.type==="task") {
      delete item.deletedAt; delete item.type;
      state.data.tasks.push(item);
    } else if (item.type==="project") {
      delete item.deletedAt; delete item.type;
      state.data.projects.push(item);
    }
    persist(); render({ animateView: false }); showToast("Restored");
  }

  function permanentlyDeleteItem(id) {
    const item = state.data.deleted.find(x=>x.id===id);
    if(!item) return;
    if(!confirm(`Permanently delete “${item.title || item.name}”? This can't be undone.`)) return;
    state.data.deleted = state.data.deleted.filter(x=>x.id!==id);
    persist(); render({ animateView: false }); showToast("Deleted permanently");
  }

  function emptyTrash() {
    if(!state.data.deleted.length) return;
    if(!confirm("Permanently delete everything in Recently Deleted? This can't be undone.")) return;
    state.data.deleted = [];
    persist(); render({ animateView: false }); showToast("Recently Deleted emptied");
  }

  // Deleting a project detaches (not deletes) its tasks — they become
  // standalone, matching the same rule the Python core prototype enforces.
  // A project that still has sub-projects can't be deleted until those are
  // moved or removed first.
  function deleteProject(id) {
    const project = projectById(id);
    if (!project) return;
    const children = state.data.projects.filter(p => p.parentId === id);
    if (children.length) {
      alert(`“${project.name}” still has sub-projects. Move or delete those first.`);
      return;
    }
    if (!confirm(`Delete “${project.name}”? Its tasks will become standalone, and the project moves to Recently Deleted for 30 days.`)) return;
    state.data.tasks.forEach(t => { if (t.projectId === id) t.projectId = null; });
    state.data.projects = state.data.projects.filter(p => p.id !== id);
    state.data.deleted.unshift({ ...project, deletedAt: Date.now(), type: "project" });
    if (state.selectedProjectId === id) { state.selectedProjectId = null; state.view = "all"; }
    persist(); render(); showToast("Project moved to Recently Deleted");
  }

  function addProject() { openProjectModal(null); }
  function editProject(id) { openProjectModal(id); }

  // Project create/edit modal — replaces the old prompt()-based flow. prompt()
  // is a bare, unstyled OS dialog (always white in both light and dark mode,
  // and only ever takes plain text), so a hex color had to be typed by hand
  // and the description couldn't be styled at all. This reuses the same
  // themed modal surface as the task editor, and gives color a real picker:
  // a curated swatch palette plus a native color input that opens the
  // system's own wheel/sliders/crayons picker on macOS — no hex typing.
  function openProjectModal(projectId = null) {
    const existing = projectId ? projectById(projectId) : null;
    const isNew = !existing;
    const color = existing?.color || PROJECT_COLORS[0];

    $("#taskModal").innerHTML = `
      <div class="modal-header">
        <input class="modal-title-input" id="modalProjectName" value="${escapeHtml(existing?.name || "")}" placeholder="Project name" autofocus>
        <button class="close-button" id="closeModal" aria-label="Close">${icon("close")}</button>
      </div>
      <textarea class="notes-field" id="modalProjectDescription" rows="3" placeholder="Description">${escapeHtml(existing?.description || "")}</textarea>
      <div class="meta-row">
        <label class="meta-field color-field">
          <span>Color</span>
          <div class="color-picker-row">
            <label class="color-wheel-swatch" id="colorWheelSwatch" style="background:${escapeHtml(color)}" title="Custom color">
              <input type="color" id="modalProjectColorInput" value="${escapeHtml(color)}">
            </label>
            <div class="color-swatches" id="colorSwatches">
              ${PROJECT_COLORS.map(c => `<button type="button" class="color-swatch${c.toLowerCase()===color.toLowerCase()?" selected":""}" data-color="${c}" style="background:${c}" aria-label="${c}" title="${c}"></button>`).join("")}
            </div>
          </div>
        </label>
      </div>
      <div class="modal-footer">
        <button class="danger-button" id="deleteProjectModal">${isNew ? "" : "Delete"}</button>
        <div style="margin-left:auto;display:flex;gap:6px"><button class="save-button" id="saveProjectModal">Done</button></div>
      </div>`;
    openOverlay($("#modalBackdrop"));

    $("#closeModal").onclick = closeModal;
    $("#saveProjectModal").onclick = () => saveProjectFromModal(existing);
    if (!isNew) $("#deleteProjectModal").onclick = () => { closeModal(); deleteProject(existing.id); };
    $("#modalProjectName").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); saveProjectFromModal(existing); } };

    const colorInput = $("#modalProjectColorInput");
    const wheelSwatch = $("#colorWheelSwatch");
    const swatchWrap = $("#colorSwatches");
    colorInput.addEventListener("input", () => {
      wheelSwatch.style.background = colorInput.value;
      $$(".color-swatch", swatchWrap).forEach(s => s.classList.toggle("selected", s.dataset.color.toLowerCase() === colorInput.value.toLowerCase()));
    });
    $$(".color-swatch", swatchWrap).forEach(btn => {
      btn.onclick = () => {
        colorInput.value = btn.dataset.color;
        wheelSwatch.style.background = btn.dataset.color;
        $$(".color-swatch", swatchWrap).forEach(s => s.classList.remove("selected"));
        btn.classList.add("selected");
      };
    });
  }

  function saveProjectFromModal(existing) {
    const name = $("#modalProjectName").value.trim();
    if (!name) { $("#modalProjectName").focus(); return; }
    const description = $("#modalProjectDescription").value.trim();
    const color = $("#modalProjectColorInput").value;

    if (existing) {
      existing.name = name;
      existing.description = description;
      existing.color = color;
      persist(); closeModal(); render({ animateView: false }); showToast("Project updated");
    } else {
      const project = {
        id: uid("project"), name, description, color,
        icon: name[0].toUpperCase(), favorite: false, parentId: null,
        order: state.data.projects.length
      };
      state.data.projects.push(project);
      persist(); closeModal(); render(); showToast("Project created");
    }
  }

  function taskContextMenuSections(task) {
    const projectOptions = [{ id: "", name: "Inbox" }, ...state.data.projects];
    return [
      { key: "actions", items: [
        { label: task.completed ? "Mark as Not Done" : "Mark as Done", onClick: () => toggleComplete(task.id) },
        { label: task.favorite ? "Remove from Favorites" : "Add to Favorites", onClick: () => toggleFavorite(task.id) },
        { label: "Edit…", onClick: () => openTaskModal(task.id) }
      ]},
      { key: "move", label: "Move to", scroll: true, items: projectOptions.map(p => ({
        label: p.name,
        active: (task.projectId || "") === p.id,
        onClick: () => moveTaskToProject(task.id, p.id || null)
      })) },
      { key: "danger", items: [
        { label: "Delete", danger: true, onClick: () => deleteTask(task.id) }
      ]}
    ];
  }

  function projectContextMenuSections(project) {
    return [
      { key: "actions", items: [
        { label: "New Task", onClick: () => { state.selectedProjectId = project.id; openTaskModal(); } },
        { label: "Edit Project…", onClick: () => editProject(project.id) }
      ]},
      { key: "danger", items: [
        { label: "Delete Project", danger: true, onClick: () => deleteProject(project.id) }
      ]}
    ];
  }

  function closeContextMenu() {
    const menu = document.querySelector(".context-menu");
    if (menu) menu.remove();
    document.removeEventListener("mousedown", handleContextMenuOutsideClick, true);
  }

  function handleContextMenuOutsideClick(e) {
    if (!e.target.closest(".context-menu")) closeContextMenu();
  }

  function openContextMenu(x, y, sections) {
    closeContextMenu();
    const menu = document.createElement("div");
    menu.className = "context-menu glass-panel";
    menu.setAttribute("role", "menu");
    menu.innerHTML = sections.map((section, si) => `
      ${si > 0 ? `<div class="context-menu-divider"></div>` : ""}
      ${section.label ? `<div class="context-menu-label">${escapeHtml(section.label)}</div>` : ""}
      <div class="${section.scroll ? "context-menu-projects" : ""}">
        ${section.items.map((item, ii) => `
          <button class="context-menu-item ${item.danger ? "danger" : ""}" role="menuitem" data-menu-key="${section.key}-${ii}">
            <span>${escapeHtml(item.label)}</span>${item.active ? `<span class="check-mark">✓</span>` : ""}
          </button>`).join("")}
      </div>`).join("");
    document.body.appendChild(menu);

    const vw = window.innerWidth, vh = window.innerHeight;
    menu.style.left = Math.max(8, Math.min(x, vw - menu.offsetWidth - 8)) + "px";
    menu.style.top = Math.max(8, Math.min(y, vh - menu.offsetHeight - 8)) + "px";

    sections.forEach(section => {
      section.items.forEach((item, ii) => {
        const el = menu.querySelector(`[data-menu-key="${section.key}-${ii}"]`);
        if (el) el.onclick = () => { closeContextMenu(); item.onClick(); };
      });
    });

    setTimeout(() => document.addEventListener("mousedown", handleContextMenuOutsideClick, true), 0);
  }

  function showToast(message, undo=false) {
    $("#toastMessage").textContent = message;
    $("#toastUndo").classList.toggle("is-hidden", !undo);
    $("#toast").classList.add("is-open");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(()=>$("#toast").classList.remove("is-open"), 2600);
  }

  function openSearch() {
    openOverlay($("#commandOverlay"));
    $("#globalSearch").value = state.searchQuery;
    $("#globalSearch").focus();
    renderCommandResults();
  }

  function closeSearch() { closeOverlay($("#commandOverlay")); }

  function renderCommandResults() {
    $("#searchResults").innerHTML = renderSearchResults($("#globalSearch").value);
    $$("#searchResults .search-result[data-result-id]").forEach(el => {
      el.onclick = () => {
        const id = el.dataset.resultId;
        if(el.dataset.resultKind==="Task" || el.dataset.resultKind==="Subtask") { closeSearch(); openTaskModal(id); }
        else if(id) { closeSearch(); state.selectedProjectId=id; state.view="all"; state.searchQuery=""; render(); }
      };
    });
    $$("#searchResults [data-recent-search]").forEach(el => {
      el.onclick = () => {
        $("#globalSearch").value = el.dataset.recentSearch;
        state.searchQuery = el.dataset.recentSearch;
        renderCommandResults();
      };
    });
    $$("#searchResults [data-remove-recent]").forEach(el => {
      el.onclick = e => { e.stopPropagation(); removeRecentSearch(el.dataset.removeRecent); renderCommandResults(); };
    });
  }

  function removeRecentSearch(value) {
    state.data.recentSearches = (state.data.recentSearches || []).filter(s => s !== value);
    persist();
  }

  function bindGlobalInteractions() {
    $$(".nav-item").forEach(btn => btn.onclick = () => {
      state.selectedProjectId = null;
      state.view = btn.dataset.view;
      state.searchQuery = "";
      closeSidebar();
      render();
      if(state.view==="search") setTimeout(()=>$("#pageSearch")?.focus(),0);
    });

    $$(".project-row, [data-project]").forEach(el => {
      el.onclick = e => {
        if (e.target.closest("[data-action]")) return;
        state.selectedProjectId = el.dataset.project;
        state.view = "all";
        closeSidebar();
        render();
      };
      el.oncontextmenu = e => {
        e.preventDefault();
        const project = projectById(el.dataset.project);
        if (project) openContextMenu(e.clientX, e.clientY, projectContextMenuSections(project));
      };
      el.ondragover = e => { e.preventDefault(); el.classList.add("drop-target-project"); };
      el.ondragleave = () => el.classList.remove("drop-target-project");
      el.ondrop = e => {
        e.preventDefault();
        el.classList.remove("drop-target-project");
        const taskId = e.dataTransfer.getData("text/plain");
        if (taskId) moveTaskToProject(taskId, el.dataset.project);
      };
    });

    $$("[data-action='new-task']").forEach(el => el.onclick = () => openTaskModal());
    $$("[data-action='empty-trash']").forEach(el => el.onclick = emptyTrash);
    $("#newTaskButton").onclick = () => { closeSidebar(); openTaskModal(); };
    $("#addProjectButton").onclick = addProject;
    $("#searchButton").onclick = openSearch;
    $("#settingsButton").onclick = () => { state.selectedProjectId=null; state.view="settings"; closeSidebar(); render(); };
    $("#menuButton").onclick = toggleSidebar;
    $("#sidebarBackdrop").onclick = closeSidebar;

    $("#quickAdd")?.addEventListener("submit", e => {
      e.preventDefault();
      createQuickTask($("#quickAddInput").value);
    });

    $("#completedToggle")?.addEventListener("click", () => {
      state.completedOpen = !state.completedOpen;
      render({ animateView: false });
    });

    const favoritesNav = $('.nav-item[data-view="favorites"]');
    if (favoritesNav) {
      favoritesNav.ondragover = e => { e.preventDefault(); favoritesNav.classList.add("drop-target-project"); };
      favoritesNav.ondragleave = () => favoritesNav.classList.remove("drop-target-project");
      favoritesNav.ondrop = e => {
        e.preventDefault();
        favoritesNav.classList.remove("drop-target-project");
        const taskId = e.dataTransfer.getData("text/plain");
        const task = taskId && state.data.tasks.find(t => t.id === taskId);
        if (task && !task.favorite) { task.favorite = true; persist(); render({ animateView: false }); showToast("Added to Favorites"); }
      };
    }

    $$("[data-complete]").forEach(el => el.onclick = e => { e.stopPropagation(); toggleComplete(el.dataset.complete); });
    $$("[data-favorite]").forEach(el => el.onclick = e => { e.stopPropagation(); toggleFavorite(el.dataset.favorite); });
    $$("[data-edit-project]").forEach(el => el.onclick = () => editProject(el.dataset.editProject));
    $$("[data-restore]").forEach(el => el.onclick = () => restoreItem(el.dataset.restore));
    $$("[data-permanent-delete]").forEach(el => el.onclick = () => permanentlyDeleteItem(el.dataset.permanentDelete));

    let openTaskTimer = null;
    $$("[data-open-task]").forEach(el => {
      el.onclick = () => {
        clearTimeout(openTaskTimer);
        openTaskTimer = setTimeout(() => openTaskModal(el.dataset.openTask), 220);
      };
      el.ondblclick = () => {
        clearTimeout(openTaskTimer);
        const titleEl = $(".task-title", el);
        if (titleEl) enableInlineTitleEdit(el.dataset.openTask, titleEl);
      };
    });

    $$(".task-row[draggable='true']").forEach(row => {
      row.addEventListener("mousedown", () => setFocusedTask(row.dataset.taskId));
      row.oncontextmenu = e => {
        e.preventDefault();
        const task = state.data.tasks.find(t => t.id === row.dataset.taskId);
        if (task) openContextMenu(e.clientX, e.clientY, taskContextMenuSections(task));
      };
      row.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", row.dataset.taskId);
        e.dataTransfer.effectAllowed = "move";
        row.classList.add("dragging");
      });
      row.addEventListener("dragend", () => row.classList.remove("dragging", "drop-before", "drop-after"));
      row.addEventListener("dragover", e => {
        e.preventDefault();
        const rect = row.getBoundingClientRect();
        const before = e.clientY - rect.top < rect.height / 2;
        row.classList.toggle("drop-before", before);
        row.classList.toggle("drop-after", !before);
      });
      row.addEventListener("dragleave", () => row.classList.remove("drop-before", "drop-after"));
      row.addEventListener("drop", e => {
        e.preventDefault();
        const before = row.classList.contains("drop-before");
        row.classList.remove("drop-before", "drop-after");
        reorderTask(e.dataTransfer.getData("text/plain"), row.dataset.taskId, before);
      });
    });

    $("#pageSearch")?.addEventListener("input", e => {
      state.searchQuery = e.target.value;
      if (state.searchQuery.trim()) {
        state.data.recentSearches = [state.searchQuery.trim(), ...(state.data.recentSearches||[]).filter(x=>x!==state.searchQuery.trim())].slice(0,6);
        persist();
      }
      $("#pageSearchResults").innerHTML = renderSearchResults(state.searchQuery);
      bindPageSearchResults();
    });
    bindPageSearchResults();

    $("#appearanceSelect")?.addEventListener("change", e => {
      state.data.appearance=e.target.value; persist(); applyAppearance();
    });
    $("#notificationSelect")?.addEventListener("change", e => {
      state.data.notifications = e.target.value; persist(); showToast("Notification setting saved");
    });
    $("#resetData")?.addEventListener("click", () => {
      if(confirm("Reset the frontend prototype to its original demo data?")) {
        state.data=clone(DEFAULT_DATA); persist(); state.view="all"; state.selectedProjectId=null; render(); showToast("Demo data reset");
      }
    });
  }

  function bindPageSearchResults() {
    $$("#pageSearchResults .search-result[data-result-id]").forEach(el => {
      el.onclick = () => {
        const id = el.dataset.resultId;
        if (el.dataset.resultKind === "Task" || el.dataset.resultKind === "Subtask") { openTaskModal(id); }
        else if (id) { state.selectedProjectId = id; state.view = "all"; state.searchQuery = ""; render(); }
      };
    });
    $$("#pageSearchResults [data-recent-search]").forEach(el => {
      el.onclick = () => { state.searchQuery = el.dataset.recentSearch; render(); setTimeout(()=>$("#pageSearch")?.focus(),0); };
    });
    $$("#pageSearchResults [data-remove-recent]").forEach(el => {
      el.onclick = e => {
        e.stopPropagation();
        removeRecentSearch(el.dataset.removeRecent);
        $("#pageSearchResults").innerHTML = renderSearchResults(state.searchQuery);
        bindPageSearchResults();
      };
    });
  }

  function reorderTask(sourceId, targetId, before = false) {
    if(sourceId===targetId) return;
    const source=state.data.tasks.find(t=>t.id===sourceId), target=state.data.tasks.find(t=>t.id===targetId);
    if(!source||!target) return;
    if(source.projectId!==target.projectId) {
      source.projectId=target.projectId;
    }
    const siblings=state.data.tasks.filter(t=>t.projectId===target.projectId && t.parentTaskId===target.parentTaskId && t.id!==source.id).sort((a,b)=>a.order-b.order);
    let targetIndex=siblings.findIndex(t=>t.id===target.id);
    if (!before) targetIndex += 1;
    siblings.splice(Math.max(0,targetIndex),0,source);
    siblings.forEach((t,i)=>t.order=i);
    persist(); render({ animateView: false }); showToast("Task moved");
  }

  function moveTaskToProject(taskId, projectId) {
    const task = state.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    const normalizedId = projectId || null;
    if (task.projectId === normalizedId) return;
    task.projectId = normalizedId;
    persist(); render({ animateView: false });
    showToast(normalizedId ? `Moved to ${projectById(normalizedId)?.name || "project"}` : "Moved to Inbox");
  }

  function enableInlineTitleEdit(taskId, titleEl) {
    const task = state.data.tasks.find(t => t.id === taskId);
    if (!task || !titleEl || !titleEl.isConnected) return;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "inline-edit-input";
    input.value = task.title;
    titleEl.replaceWith(input);
    input.focus();
    input.select();
    const commit = () => {
      const value = input.value.trim();
      if (value && value !== task.title) { task.title = value; persist(); }
      render({ animateView: false });
    };
    input.addEventListener("keydown", e => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { e.preventDefault(); render({ animateView: false }); }
    });
    input.addEventListener("click", e => e.stopPropagation());
    input.addEventListener("blur", commit);
  }

  function setFocusedTask(id) {
    if (state.focusedTaskId === id) return;
    const prev = state.focusedTaskId;
    state.focusedTaskId = id;
    if (prev) $(`.task-row[data-task-id="${prev}"]`)?.classList.remove("focused");
    if (id) $(`.task-row[data-task-id="${id}"]`)?.classList.add("focused");
  }

  function applyAppearance() {
    const value = state.data.appearance;
    document.documentElement.dataset.theme = value;
    if(value==="dark") document.documentElement.style.colorScheme="dark";
    else if(value==="light") document.documentElement.style.colorScheme="light";
    else document.documentElement.style.colorScheme="";
  }

  function overlayOpen() {
    return $("#modalBackdrop").classList.contains("is-open")
      || $("#commandOverlay").classList.contains("is-open")
      || document.querySelector(".context-menu");
  }

  function bindKeyboard() {
    document.addEventListener("keydown", e => {
      const cmd = e.metaKey || e.ctrlKey;
      if(cmd && (e.key.toLowerCase()==="k" || e.key.toLowerCase()==="f")) { e.preventDefault(); openSearch(); return; }
      if(cmd && e.key==="\\") { e.preventDefault(); toggleSidebar(); return; }
      if(e.key==="Escape") { closeSearch(); closeModal(); closeContextMenu(); closeSidebar(); return; }

      // New Task deliberately uses a bare "N" rather than ⌘N — Safari (and
      // other browsers) reserve ⌘N for "New Window" at the OS/browser level,
      // and preventDefault() cannot override that reserved shortcut. A plain
      // key has no such conflict. Only fires when the user isn't typing
      // anywhere and no overlay is covering the page.
      const typing = ["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName);
      if (typing || overlayOpen() || cmd || e.altKey) return;

      if (e.key.toLowerCase() === "n") { e.preventDefault(); openTaskModal(); return; }

      const rows = $$(".task-row[data-task-id]");
      if (!rows.length) return;
      const ids = rows.map(r => r.dataset.taskId);

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        let index = ids.indexOf(state.focusedTaskId);
        index = e.key === "ArrowDown" ? Math.min(ids.length - 1, index + 1) : Math.max(0, index - 1);
        setFocusedTask(ids[index]);
        $(`.task-row[data-task-id="${ids[index]}"]`)?.scrollIntoView?.({ block: "nearest" });
      } else if (e.key === "Enter" && state.focusedTaskId) {
        e.preventDefault(); openTaskModal(state.focusedTaskId);
      } else if (e.key === " " && state.focusedTaskId) {
        e.preventDefault(); toggleComplete(state.focusedTaskId);
      } else if (e.key.toLowerCase() === "f" && state.focusedTaskId) {
        e.preventDefault(); toggleFavorite(state.focusedTaskId);
      } else if ((e.key === "Backspace" || e.key === "Delete") && state.focusedTaskId) {
        e.preventDefault(); deleteTask(state.focusedTaskId);
      }
    });
    $("#commandOverlay").addEventListener("click", e => { if(e.target.id==="commandOverlay") closeSearch(); });
    $("#globalSearch").addEventListener("input", e => { state.searchQuery=e.target.value; renderCommandResults(); });
    $("#toastUndo").onclick = () => {
      if(state.lastAction?.type==="restoreTask") {
        const task=state.lastAction.task;
        state.data.deleted=state.data.deleted.filter(x=>x.id!==task.id);
        state.data.tasks.push(task);
        state.lastAction=null; persist(); render({ animateView: false }); showToast("Undo complete");
      }
    };
    $("#modalBackdrop").addEventListener("click", e => { if(e.target.id==="modalBackdrop") closeModal(); });
  }

  hydrateIcons(document);
  applyAppearance();
  applySidebarCollapsed();
  render();
  bindKeyboard();
})();
