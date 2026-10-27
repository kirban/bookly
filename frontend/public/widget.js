(function () {
  var BOOKLY_BASE = "https://bookly.app";

  function init() {
    var script = document.currentScript || document.querySelector("script[data-bookly-slug]");
    if (!script) return;

    var slug = script.getAttribute("data-bookly-slug");
    if (!slug) return;

    var color = script.getAttribute("data-bookly-color") || "#2563eb";
    var text = script.getAttribute("data-bookly-text") || "Записаться";
    var position = script.getAttribute("data-bookly-position") || "bottom-right";

    var btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText =
      "position:fixed;z-index:99999;padding:12px 24px;border:none;border-radius:28px;" +
      "background:" + color + ";color:#fff;font-size:16px;font-family:sans-serif;" +
      "cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.2s;" +
      (position === "bottom-left" ? "bottom:24px;left:24px;" : "bottom:24px;right:24px;");

    btn.onmouseenter = function () { btn.style.transform = "scale(1.05)"; };
    btn.onmouseleave = function () { btn.style.transform = "scale(1)"; };

    btn.onclick = function () {
      var overlay = document.createElement("div");
      overlay.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;z-index:100000;" +
        "background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;";

      var modal = document.createElement("div");
      modal.style.cssText =
        "width:90%;max-width:480px;height:85vh;background:#fff;border-radius:16px;" +
        "overflow:hidden;position:relative;";

      var close = document.createElement("button");
      close.textContent = "\u00D7";
      close.style.cssText =
        "position:absolute;top:8px;right:12px;z-index:1;background:none;border:none;" +
        "font-size:28px;cursor:pointer;color:#666;";
      close.onclick = function () { document.body.removeChild(overlay); };

      var iframe = document.createElement("iframe");
      iframe.src = BOOKLY_BASE + "/" + slug + "/book?embed=1";
      iframe.style.cssText = "width:100%;height:100%;border:none;";

      modal.appendChild(close);
      modal.appendChild(iframe);
      overlay.appendChild(modal);
      overlay.onclick = function (e) {
        if (e.target === overlay) document.body.removeChild(overlay);
      };
      document.body.appendChild(overlay);
    };

    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
