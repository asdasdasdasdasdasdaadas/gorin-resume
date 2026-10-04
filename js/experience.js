(function () {
  "use strict";

  var root = document.documentElement;
  var themeButtons = Array.prototype.slice.call(document.querySelectorAll(".theme"));
  var mast = document.querySelector(".bar");
  var glass = document.querySelector(".glassbar");

  function applyTheme(theme) {
    var dark = theme !== "light";
    root.setAttribute("data-theme", dark ? "dark" : "light");
    themeButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", dark ? "true" : "false");
      button.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
    });
    var color = document.querySelector('meta[name="theme-color"]');
    if (color) color.setAttribute("content", dark ? "#0b0b0d" : "#efeff0");
  }

  themeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
      syncInk();
    });
  });
  applyTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");

  var lensImage = document.getElementById("lens-map-image");
  var lensPlate = glass && glass.querySelector(".glass-plate");

  function fitLens() {
    if (!lensImage || !lensPlate) return;
    lensImage.setAttribute("width", String(lensPlate.offsetWidth));
    lensImage.setAttribute("height", String(lensPlate.offsetHeight));
  }

  if (mast && glass) {
    var reveal = function () {
      var edge = mast.offsetTop + mast.offsetHeight;
      var on = window.scrollY > edge - 8;
      glass.classList.toggle("is-on", on);
      glass.setAttribute("aria-hidden", on ? "false" : "true");
      glass.inert = !on;
      if (on) syncInk();
    };
    fitLens();
    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("resize", function () {
      fitLens();
      reveal();
    });
    window.addEventListener("load", fitLens);
  }

  var stage = document.getElementById("stage");
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));

  if (!stage || tabs.length === 0) return;

  function select(tab, focus) {
    tabs.forEach(function (item) {
      var selected = item === tab;
      var panel = document.getElementById(item.getAttribute("aria-controls"));

      item.setAttribute("aria-selected", selected ? "true" : "false");
      item.tabIndex = selected ? 0 : -1;
      if (panel) panel.hidden = !selected;
    });

    stage.setAttribute("data-b", tab.getAttribute("data-b") || "");
    if (focus) tab.focus();
    syncInk();
  }

  function parseColor(input) {
    var value = String(input || "").trim();
    var hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    var h, rgb, alpha;
    if (hex) {
      h = hex[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
    }
    rgb = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?/);
    if (!rgb) return null;
    alpha = 1;
    if (rgb[4] !== undefined) alpha = rgb[4].indexOf("%") >= 0 ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    return [parseFloat(rgb[1]), parseFloat(rgb[2]), parseFloat(rgb[3]), alpha];
  }

  function luma(rgb) {
    function lin(channel) {
      var c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  }

  function backdropInk(x, y) {
    var stack = document.elementsFromPoint(x, y);
    var i, el, stageEl, node, box, bg, parsed, fg;

    for (i = 0; i < stack.length; i++) {
      el = stack[i];
      if (!el || !el.closest || glass.contains(el)) continue;
      stageEl = el.closest(".stage");
      if (stageEl) {
        fg = parseColor(getComputedStyle(stageEl).getPropertyValue("--fg"));
        return fg && luma(fg) > 0.5 ? "light" : "dark";
      }
      node = el;
      while (node && node !== root) {
        box = node.getBoundingClientRect();
        bg = parseColor(getComputedStyle(node).backgroundColor);
        if (bg && bg[3] > 0.55 && box.width > 120 && box.height > 36) {
          return luma(bg) > 0.58 ? "dark" : "light";
        }
        node = node.parentElement;
      }
      break;
    }

    parsed = parseColor(getComputedStyle(document.body).backgroundColor);
    return parsed && luma(parsed) > 0.58 ? "dark" : "light";
  }

  function syncInk() {
    if (!glass || !glass.classList.contains("is-on")) return;
    [".glass-lead", ".glass-title", ".glass-end"].forEach(function (selector) {
      var el = glass.querySelector(selector);
      var box, ink;
      if (!el) return;
      box = el.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) return;
      ink = backdropInk(box.left + box.width / 2, box.top + Math.min(box.height / 2, 27));
      if (el.getAttribute("data-ink") !== ink) el.setAttribute("data-ink", ink);
    });
  }

  function expandForPrint() {
    document.querySelectorAll(".panel").forEach(function (panel) {
      panel.hidden = false;
    });
    document.querySelectorAll("details").forEach(function (item) {
      item.dataset.wasOpen = item.open ? "true" : "false";
      item.open = true;
    });
  }

  function restoreAfterPrint() {
    tabs.forEach(function (tab) {
      var selected = tab.getAttribute("aria-selected") === "true";
      var panel = document.getElementById(tab.getAttribute("aria-controls"));
      if (panel) panel.hidden = !selected;
    });
    document.querySelectorAll("details").forEach(function (item) {
      item.open = item.dataset.wasOpen === "true";
    });
  }

  window.addEventListener("beforeprint", expandForPrint);
  window.addEventListener("afterprint", restoreAfterPrint);

  Array.prototype.forEach.call(document.querySelectorAll(".pdf"), function (pdf) {
    pdf.addEventListener("click", function () {
      window.print();
    });
  });

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      select(tab, false);
    });

    tab.addEventListener("keydown", function (event) {
      var next = null;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = tabs[(index + 1) % tabs.length];
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = tabs[(index - 1 + tabs.length) % tabs.length];
      } else if (event.key === "Home") {
        next = tabs[0];
      } else if (event.key === "End") {
        next = tabs[tabs.length - 1];
      }

      if (!next) return;
      event.preventDefault();
      select(next, true);
    });
  });
})();
