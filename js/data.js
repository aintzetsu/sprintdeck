/* ==========================================================================
   SprintDeck — Columns, Initial Sprint Issues & Helpers
   ========================================================================== */

(function (global) {
  "use strict";

  const COLUMNS = [
    { id: "backlog", title: "Backlog", color: "#94a3b8" },
    { id: "in_progress", title: "In Progress", color: "#6366f1" },
    { id: "in_review", title: "In Review", color: "#f59e0b" },
    { id: "done", title: "Done", color: "#22c55e" }
  ];

  const INITIAL_ISSUES = [
    {
      id: "SD-101",
      title: "Implement OAuth PKCE refresh token rotation",
      description: "Rotate short-lived refresh tokens on edge middleware with replay detection.",
      status: "in_progress",
      priority: "Urgent",
      tag: "API",
      points: 5,
      assignee: "AK"
    },
    {
      id: "SD-102",
      title: "Fix mobile horizontal scroll in pricing comparison grid",
      description: "Ensure sticky plan header clips cleanly below 640px viewport width.",
      status: "in_review",
      priority: "High",
      tag: "Frontend",
      points: 2,
      assignee: "JL"
    },
    {
      id: "SD-103",
      title: "Keyboard shortcut overlay (? help modal)",
      description: "Pressing ? opens shortcut sheet for creating issues and jumping columns.",
      status: "backlog",
      priority: "Medium",
      tag: "Design",
      points: 3,
      assignee: "MR"
    },
    {
      id: "SD-104",
      title: "Add CSV batch export for sprint velocity reports",
      description: "Download closed story points grouped by assignee and sprint tag.",
      status: "backlog",
      priority: "Low",
      tag: "API",
      points: 3,
      assignee: "AK"
    },
    {
      id: "SD-105",
      title: "Race condition when dragging card across columns fast",
      description: "Debounce drop target highlight and lock card ID during dragover events.",
      status: "in_progress",
      priority: "High",
      tag: "Bug",
      points: 3,
      assignee: "ST"
    },
    {
      id: "SD-106",
      title: "Design dark-mode token contrast audit (WCAG AA)",
      description: "Verify all muted labels and focus rings meet 4.5:1 contrast ratio.",
      status: "done",
      priority: "Medium",
      tag: "Design",
      points: 2,
      assignee: "MR"
    },
    {
      id: "SD-107",
      title: "Optimize board filter indexing for 500+ issues",
      description: "Precompute lowercase search strings so typing stays under 2ms per frame.",
      status: "done",
      priority: "High",
      tag: "Frontend",
      points: 5,
      assignee: "JL"
    }
  ];

  global.SprintData = {
    COLUMNS: COLUMNS,
    INITIAL_ISSUES: INITIAL_ISSUES
  };
})(window);
