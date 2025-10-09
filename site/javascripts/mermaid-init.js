// Mermaid init for MkDocs Material (works with navigation.instant)
(function () {
    function currentTheme() {
        // MkDocs Material sets data-md-color-scheme on <html>
        var scheme =
            document.documentElement.getAttribute("data-md-color-scheme") ||
            "default";
        return scheme === "slate" ? "dark" : "default";
    }

    function render() {
        if (!window.mermaid) return;
        try {
            window.mermaid.initialize({
                startOnLoad: false,
                theme: currentTheme(),
            });
            // Prefer div.mermaid (with custom_fences). Fallback to code.language-mermaid.
            var nodes = document.querySelectorAll(
                ".mermaid, code.language-mermaid"
            );
            if (nodes.length) {
                // Mermaid v10+
                if (typeof window.mermaid.run === "function") {
                    window.mermaid.run({ nodes: nodes });
                } else if (typeof window.mermaid.init === "function") {
                    window.mermaid.init(undefined, nodes);
                }
            }
        } catch (e) {
            console.error("Mermaid init error:", e);
        }
    }

    // First load
    document.addEventListener("DOMContentLoaded", render);

    // Re-run after SPA navigation by MkDocs Material
    if (window.document$ && typeof window.document$.subscribe === "function") {
        window.document$.subscribe(render);
    }

    // Re-render on color scheme toggle
    document.addEventListener("colorschemechange", render);
})();
