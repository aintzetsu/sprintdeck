/* ==========================================================================
   SprintDeck — Drag-and-Drop Kanban Controller & Persistence
   ========================================================================== */

(function (global) {
  "use strict";

  const STORAGE_THEME = "sprintdeck_theme";
  const STORAGE_ISSUES = "sprintdeck_issues";
  const Data = global.SprintData;

  function safeGet(key, fallback) {
    try {
      const v = global.localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function safeSet(key, val) {
    try {
      global.localStorage.setItem(key, JSON.stringify(val));
    } catch (_err) {
      // Ignore storage failures
    }
  }

  function cloneIssues(list) {
    return list.map(function (item) {
      return Object.assign({}, item);
    });
  }

  const state = {
    theme: safeGet(STORAGE_THEME, "dark"),
    issues: safeGet(STORAGE_ISSUES, cloneIssues(Data.INITIAL_ISSUES)),
    view: "board", // "board" | "list"
    search: "",
    tagFilter: "all",
    prioFilter: "all",
    draggedId: null,
    editingId: null
  };

  const dom = {};

  function cacheDom() {
    dom.themeToggle = document.getElementById("theme-toggle");
    dom.resetBtn = document.getElementById("reset-sprint-btn");
    dom.newIssueBtn = document.getElementById("new-issue-btn");

    dom.progressPct = document.getElementById("sprint-progress-pct");
    dom.progressPts = document.getElementById("sprint-progress-pts");
    dom.progressFill = document.getElementById("sprint-meter-fill");

    dom.searchInput = document.getElementById("issue-search");
    dom.prioSelect = document.getElementById("prio-filter");
    dom.tagPills = document.querySelectorAll("[data-tag-filter]");
    dom.viewBtns = document.querySelectorAll("[data-view]");

    dom.boardView = document.getElementById("board-view");
    dom.listView = document.getElementById("list-view");
    dom.listBody = document.getElementById("list-body");

    dom.modal = document.getElementById("issue-modal");
    dom.modalTitle = document.getElementById("issue-modal-title");
    dom.closeModalBtn = document.getElementById("close-issue-modal");
    dom.issueForm = document.getElementById("issue-form");
    dom.deleteIssueBtn = document.getElementById("delete-issue-btn");
    dom.toast = document.getElementById("toast");
  }

  function showToast(msg) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.hidden = false;
    clearTimeout(dom.toast._timer);
    dom.toast._timer = setTimeout(function () {
      dom.toast.hidden = true;
    }, 2200);
  }

  function applyTheme(theme) {
    state.theme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    safeSet(STORAGE_THEME, state.theme);
    if (dom.themeToggle) {
      dom.themeToggle.textContent = state.theme === "dark" ? "Light Mode" : "Dark Mode";
    }
  }

  function saveIssues() {
    safeSet(STORAGE_ISSUES, state.issues);
  }

  function getFilteredIssues() {
    const q = state.search.trim().toLowerCase();
    return state.issues.filter(function (issue) {
      const tagOk = state.tagFilter === "all" || issue.tag.toLowerCase() === state.tagFilter;
      const prioOk = state.prioFilter === "all" || issue.priority.toLowerCase() === state.prioFilter;
      const qOk =
        !q ||
        issue.title.toLowerCase().includes(q) ||
        issue.id.toLowerCase().includes(q) ||
        issue.assignee.toLowerCase().includes(q);
      return tagOk && prioOk && qOk;
    });
  }

  function renderSprintProgress() {
    const totalPts = state.issues.reduce(function (s, i) { return s + Number(i.points || 0); }, 0);
    const donePts = state.issues
      .filter(function (i) { return i.status === "done"; })
      .reduce(function (s, i) { return s + Number(i.points || 0); }, 0);
    const pct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;

    dom.progressPct.textContent = pct + "%";
    dom.progressPts.textContent = donePts + " / " + totalPts + " pts done";
    dom.progressFill.style.width = pct + "%";
  }

  function moveIssue(issueId, nextStatus) {
    const issue = state.issues.find(function (i) { return i.id === issueId; });
    if (!issue || issue.status === nextStatus) return;
    issue.status = nextStatus;
    saveIssues();
    render();
    const col = Data.COLUMNS.find(function (c) { return c.id === nextStatus; });
    showToast("Moved " + issue.id + " to " + (col ? col.title : nextStatus));
  }

  function renderBoard(filtered) {
    dom.boardView.innerHTML = "";
    Data.COLUMNS.forEach(function (col) {
      const colIssues = filtered.filter(function (i) { return i.status === col.id; });

      const colEl = document.createElement("section");
      colEl.className = "column";
      colEl.dataset.status = col.id;
      colEl.setAttribute("aria-label", col.title + " column");

      colEl.addEventListener("dragover", function (ev) {
        ev.preventDefault();
        colEl.classList.add("is-drag-over");
      });
      colEl.addEventListener("dragleave", function () {
        colEl.classList.remove("is-drag-over");
      });
      colEl.addEventListener("drop", function (ev) {
        ev.preventDefault();
        colEl.classList.remove("is-drag-over");
        const id = state.draggedId || ev.dataTransfer.getData("text/plain");
        if (id) moveIssue(id, col.id);
      });

      const head = document.createElement("div");
      head.className = "column__head";
      const titleWrap = document.createElement("div");
      titleWrap.className = "column__title";
      const dot = document.createElement("span");
      dot.className = "status-dot";
      dot.style.background = col.color;
      const titleTxt = document.createElement("span");
      titleTxt.textContent = col.title;
      titleWrap.appendChild(dot);
      titleWrap.appendChild(titleTxt);

      const count = document.createElement("span");
      count.className = "column__count";
      count.textContent = String(colIssues.length);
      head.appendChild(titleWrap);
      head.appendChild(count);

      const list = document.createElement("div");
      list.className = "card-list";

      colIssues.forEach(function (issue) {
        const card = document.createElement("article");
        card.className = "issue-card";
        card.draggable = true;
        card.tabIndex = 0;

        card.addEventListener("dragstart", function (ev) {
          state.draggedId = issue.id;
          card.classList.add("is-dragging");
          ev.dataTransfer.setData("text/plain", issue.id);
        });
        card.addEventListener("dragend", function () {
          state.draggedId = null;
          card.classList.remove("is-dragging");
        });
        card.addEventListener("click", function () {
          openIssueModal(issue.id);
        });
        card.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            openIssueModal(issue.id);
          }
        });

        const top = document.createElement("div");
        top.className = "issue-card__top";
        const idSpan = document.createElement("span");
        idSpan.textContent = issue.id + " · " + issue.points + "pt";
        const prioSpan = document.createElement("span");
        prioSpan.className = "badge prio--" + issue.priority.toLowerCase();
        prioSpan.textContent = issue.priority;
        top.appendChild(idSpan);
        top.appendChild(prioSpan);

        const title = document.createElement("h3");
        title.className = "issue-card__title";
        title.textContent = issue.title;

        const footer = document.createElement("div");
        footer.className = "issue-card__footer";
        const tag = document.createElement("span");
        tag.className = "badge";
        tag.textContent = issue.tag;
        const avatar = document.createElement("span");
        avatar.className = "avatar";
        avatar.textContent = issue.assignee;
        footer.appendChild(tag);
        footer.appendChild(avatar);

        card.appendChild(top);
        card.appendChild(title);
        card.appendChild(footer);
        list.appendChild(card);
      });

      colEl.appendChild(head);
      colEl.appendChild(list);
      dom.boardView.appendChild(colEl);
    });
  }

  function renderList(filtered) {
    dom.listBody.innerHTML = "";
    filtered.forEach(function (issue) {
      const col = Data.COLUMNS.find(function (c) { return c.id === issue.status; });
      const tr = document.createElement("tr");
      tr.addEventListener("click", function () { openIssueModal(issue.id); });

      const c1 = document.createElement("td");
      c1.className = "mono";
      c1.textContent = issue.id;

      const c2 = document.createElement("td");
      c2.textContent = issue.title;

      const c3 = document.createElement("td");
      c3.textContent = col ? col.title : issue.status;

      const c4 = document.createElement("td");
      const prio = document.createElement("span");
      prio.className = "badge prio--" + issue.priority.toLowerCase();
      prio.textContent = issue.priority;
      c4.appendChild(prio);

      const c5 = document.createElement("td");
      c5.className = "mono";
      c5.textContent = issue.tag + " · " + issue.assignee;

      tr.appendChild(c1);
      tr.appendChild(c2);
      tr.appendChild(c3);
      tr.appendChild(c4);
      tr.appendChild(c5);
      dom.listBody.appendChild(tr);
    });
  }

  function render() {
    renderSprintProgress();
    const filtered = getFilteredIssues();
    const isBoard = state.view === "board";
    dom.boardView.hidden = !isBoard;
    dom.listView.hidden = isBoard;

    if (isBoard) renderBoard(filtered);
    else renderList(filtered);
  }

  function openIssueModal(issueId) {
    state.editingId = issueId || null;
    dom.issueForm.reset();

    if (state.editingId) {
      const issue = state.issues.find(function (i) { return i.id === state.editingId; });
      if (!issue) return;
      dom.modalTitle.textContent = "Edit " + issue.id;
      dom.issueForm.elements.title.value = issue.title;
      dom.issueForm.elements.description.value = issue.description || "";
      dom.issueForm.elements.status.value = issue.status;
      dom.issueForm.elements.priority.value = issue.priority;
      dom.issueForm.elements.tag.value = issue.tag;
      dom.issueForm.elements.points.value = String(issue.points);
      dom.issueForm.elements.assignee.value = issue.assignee;
      dom.deleteIssueBtn.hidden = false;
    } else {
      dom.modalTitle.textContent = "Create Sprint Issue";
      dom.deleteIssueBtn.hidden = true;
    }

    dom.modal.classList.add("is-open");
    dom.modal.setAttribute("aria-hidden", "false");
    dom.issueForm.elements.title.focus();
  }

  function closeIssueModal() {
    dom.modal.classList.remove("is-open");
    dom.modal.setAttribute("aria-hidden", "true");
    state.editingId = null;
  }

  function bindEvents() {
    if (dom.themeToggle) {
      dom.themeToggle.addEventListener("click", function () {
        applyTheme(state.theme === "dark" ? "light" : "dark");
      });
    }
    if (dom.newIssueBtn) {
      dom.newIssueBtn.addEventListener("click", function () { openIssueModal(null); });
    }
    if (dom.resetBtn) {
      dom.resetBtn.addEventListener("click", function () {
        state.issues = cloneIssues(Data.INITIAL_ISSUES);
        saveIssues();
        render();
        showToast("Sprint demo reset");
      });
    }
    if (dom.searchInput) {
      dom.searchInput.addEventListener("input", function () {
        state.search = dom.searchInput.value;
        render();
      });
    }
    if (dom.prioSelect) {
      dom.prioSelect.addEventListener("change", function () {
        state.prioFilter = dom.prioSelect.value;
        render();
      });
    }
    dom.tagPills.forEach(function (pill) {
      pill.addEventListener("click", function () {
        state.tagFilter = pill.dataset.tagFilter;
        dom.tagPills.forEach(function (p) {
          const active = p === pill;
          p.classList.toggle("is-active", active);
          p.setAttribute("aria-pressed", String(active));
        });
        render();
      });
    });
    dom.viewBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.view = btn.dataset.view;
        dom.viewBtns.forEach(function (b) {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        render();
      });
    });

    if (dom.closeModalBtn) dom.closeModalBtn.addEventListener("click", closeIssueModal);
    if (dom.modal) {
      dom.modal.addEventListener("click", function (ev) {
        if (ev.target === dom.modal) closeIssueModal();
      });
    }

    if (dom.issueForm) {
      dom.issueForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        const fd = new FormData(dom.issueForm);
        const title = String(fd.get("title") || "").trim();
        if (!title) return;

        const payload = {
          title: title,
          description: String(fd.get("description") || "").trim(),
          status: String(fd.get("status") || "backlog"),
          priority: String(fd.get("priority") || "Medium"),
          tag: String(fd.get("tag") || "Frontend"),
          points: Math.max(1, Number(fd.get("points") || 3)),
          assignee: String(fd.get("assignee") || "AK").trim().toUpperCase().slice(0, 3) || "AK"
        };

        if (state.editingId) {
          const idx = state.issues.findIndex(function (i) { return i.id === state.editingId; });
          if (idx >= 0) {
            state.issues[idx] = Object.assign({ id: state.editingId }, payload);
            showToast("Updated " + state.editingId);
          }
        } else {
          const maxNum = state.issues.reduce(function (m, i) {
            const n = parseInt(i.id.replace(/\D+/g, ""), 10) || 100;
            return Math.max(m, n);
          }, 107);
          const id = "SD-" + (maxNum + 1);
          state.issues.unshift(Object.assign({ id: id }, payload));
          showToast("Created " + id);
        }

        saveIssues();
        closeIssueModal();
        render();
      });
    }

    if (dom.deleteIssueBtn) {
      dom.deleteIssueBtn.addEventListener("click", function () {
        if (!state.editingId) return;
        const removed = state.editingId;
        state.issues = state.issues.filter(function (i) { return i.id !== removed; });
        saveIssues();
        closeIssueModal();
        render();
        showToast("Deleted " + removed);
      });
    }

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeIssueModal();
    });
  }

  function init() {
    cacheDom();
    applyTheme(state.theme);
    render();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
