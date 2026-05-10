/**
 * Terminal.js — High-Fidelity Terminalism enhancements for MkDocs Material
 *
 * - Adds terminal window chrome (traffic-light dots) to code blocks
 * - Cursor blink effect on primary action buttons
 * - Smooth scroll for TOC sidebar links
 */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /*  1. Terminal window chrome on code blocks                           */
  /* ------------------------------------------------------------------ */

  function addTerminalChrome() {
    var codeBlocks = document.querySelectorAll("pre > code");

    codeBlocks.forEach(function (codeEl) {
      var pre = codeEl.parentElement;
      if (!pre || pre.querySelector(".terminal-dots")) return;

      var dots = document.createElement("div");
      dots.className = "terminal-dots";
      dots.setAttribute("aria-hidden", "true");

      dots.innerHTML =
        '<span class="terminal-dot terminal-dot--red"></span>' +
        '<span class="terminal-dot terminal-dot--yellow"></span>' +
        '<span class="terminal-dot terminal-dot--green"></span>';

      pre.style.position = "relative";
      pre.insertBefore(dots, pre.firstChild);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  2. Cursor blink on primary buttons                                */
  /* ------------------------------------------------------------------ */

  function addCursorBlink() {
    var buttons = document.querySelectorAll(
      ".md-button--primary, a.md-button--primary"
    );

    buttons.forEach(function (btn) {
      if (btn.querySelector(".terminal-cursor")) return;

      var cursor = document.createElement("span");
      cursor.className = "terminal-cursor";
      cursor.textContent = "█"; // full block character
      btn.appendChild(cursor);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  3. Smooth scroll for TOC links                                    */
  /* ------------------------------------------------------------------ */

  function enableSmoothScrollTOC() {
    document.querySelectorAll(".md-nav--secondary a[href^='#']").forEach(
      function (link) {
        link.addEventListener("click", function (e) {
          var targetId = this.getAttribute("href").slice(1);
          var target = document.getElementById(targetId);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            // Update URL hash without jump
            history.replaceState(null, "", "#" + targetId);
          }
        });
      }
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Inject minimal styles for JS-added elements                       */
  /* ------------------------------------------------------------------ */

  function injectStyles() {
    if (document.getElementById("terminal-js-styles")) return;

    var style = document.createElement("style");
    style.id = "terminal-js-styles";
    style.textContent = [
      /* Traffic-light dots */
      ".terminal-dots {",
      "  display: flex;",
      "  gap: 6px;",
      "  padding: 8px 12px 4px;",
      "}",
      ".terminal-dot {",
      "  width: 10px;",
      "  height: 10px;",
      "  border-radius: 50%;",
      "  display: inline-block;",
      "}",
      ".terminal-dot--red    { background: #ff5f57; }",
      ".terminal-dot--yellow { background: #febc2e; }",
      ".terminal-dot--green  { background: #28c840; }",

      /* Cursor blink */
      ".terminal-cursor {",
      "  display: inline-block;",
      "  margin-left: 0.35em;",
      "  animation: terminal-blink 1s step-end infinite;",
      "  font-weight: 400;",
      "  font-size: 0.85em;",
      "  vertical-align: baseline;",
      "  opacity: 0.8;",
      "}",
      "@keyframes terminal-blink {",
      "  0%, 100% { opacity: 0.8; }",
      "  50%      { opacity: 0; }",
      "}",
    ].join("\n");

    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------------ */
  /*  Bootstrap                                                         */
  /* ------------------------------------------------------------------ */

  function init() {
    injectStyles();
    addTerminalChrome();
    addCursorBlink();
    enableSmoothScrollTOC();
  }

  // Run on initial load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Re-run after MkDocs Material instant-loading navigations
  if (typeof document$ !== "undefined") {
    document$.subscribe(function () {
      init();
    });
  }
})();
