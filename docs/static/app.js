(function () {
    "use strict";

    // === Theme Toggle ===
    const toggle = document.getElementById("theme-toggle");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    function setTheme(dark) {
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
        localStorage.setItem("theme", dark ? "dark" : "light");
    }

    // Init theme: localStorage > system preference
    const stored = localStorage.getItem("theme");
    if (stored) {
        setTheme(stored === "dark");
    } else {
        setTheme(prefersDark.matches);
    }

    toggle.addEventListener("click", function () {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        setTheme(!isDark);
    });

    // === Search & Tag Filtering ===
    const searchInput = document.getElementById("search");
    const clearBtn = document.getElementById("clear-filters");
    const tagBar = document.getElementById("tag-bar");
    const cardGrid = document.getElementById("card-grid");
    const entryCount = document.getElementById("entry-count");
    const cards = Array.from(cardGrid.querySelectorAll(".card"));
    const tagButtons = Array.from(tagBar.querySelectorAll(".tag-pill"));
    const totalCount = cards.length;

    let activeTags = new Set();

    function filterCards() {
        var query = searchInput.value.toLowerCase().trim();
        var visibleCount = 0;

        cards.forEach(function (card) {
            var title = card.getAttribute("data-title");
            var description = card.getAttribute("data-description");
            var tags = card.getAttribute("data-tags");
            var text = title + " " + description + " " + tags;

            // Search match
            var matchesSearch = !query || text.indexOf(query) !== -1;

            // Tag match (AND logic)
            var matchesTags = true;
            activeTags.forEach(function (tag) {
                if (tags.indexOf(tag) === -1) {
                    matchesTags = false;
                }
            });

            if (matchesSearch && matchesTags) {
                card.classList.remove("hidden");
                visibleCount++;
            } else {
                card.classList.add("hidden");
            }
        });

        entryCount.textContent = "Showing " + visibleCount + " of " + totalCount + " entries";
    }

    searchInput.addEventListener("input", filterCards);

    tagButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var tag = btn.getAttribute("data-tag");
            if (activeTags.has(tag)) {
                activeTags.delete(tag);
                btn.classList.remove("active");
            } else {
                activeTags.add(tag);
                btn.classList.add("active");
            }
            filterCards();
        });
    });

    clearBtn.addEventListener("click", function () {
        searchInput.value = "";
        activeTags.clear();
        tagButtons.forEach(function (btn) {
            btn.classList.remove("active");
        });
        filterCards();
    });

    // Init count
    filterCards();
})();
