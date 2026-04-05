(function () {
    "use strict";

    var PER_PAGE = 12;

    // === Theme Toggle ===
    var toggle = document.getElementById("theme-toggle");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    function setTheme(dark) {
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
        localStorage.setItem("theme", dark ? "dark" : "light");
    }

    var stored = localStorage.getItem("theme");
    if (stored) {
        setTheme(stored === "dark");
    } else {
        setTheme(prefersDark.matches);
    }

    toggle.addEventListener("click", function () {
        var isDark = document.documentElement.getAttribute("data-theme") === "dark";
        setTheme(!isDark);
    });

    // === Search & Tag Filtering + Pagination ===
    var searchInput = document.getElementById("search");
    var clearBtn = document.getElementById("clear-filters");
    var tagBar = document.getElementById("tag-bar");
    var cardGrid = document.getElementById("card-grid");
    var entryCount = document.getElementById("entry-count");
    var paginationTop = document.getElementById("pagination-top");
    var paginationBottom = document.getElementById("pagination-bottom");
    var cards = Array.from(cardGrid.querySelectorAll(".card"));
    var tagButtons = Array.from(tagBar.querySelectorAll(".tag-pill"));
    var totalCount = cards.length;

    var activeTag = null;
    var currentPage = 1;
    var filteredCards = [];

    function applyFilters() {
        var query = searchInput.value.toLowerCase().trim();
        filteredCards = [];

        cards.forEach(function (card) {
            var title = card.getAttribute("data-title");
            var description = card.getAttribute("data-description");
            var tags = card.getAttribute("data-tags");
            var text = title + " " + description + " " + tags;

            var matchesSearch = !query || text.indexOf(query) !== -1;
            var matchesTag = !activeTag || tags.indexOf(activeTag) !== -1;

            if (matchesSearch && matchesTag) {
                filteredCards.push(card);
            }
        });
    }

    function renderPage() {
        var totalPages = Math.max(1, Math.ceil(filteredCards.length / PER_PAGE));
        if (currentPage > totalPages) currentPage = totalPages;

        var start = (currentPage - 1) * PER_PAGE;
        var end = start + PER_PAGE;
        var pageSet = new Set(filteredCards.slice(start, end));

        cards.forEach(function (card) {
            if (pageSet.has(card)) {
                card.classList.remove("hidden");
            } else {
                card.classList.add("hidden");
            }
        });

        entryCount.textContent = "Showing " + filteredCards.length + " of " + totalCount + " entries";
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        var html = "";
        if (totalPages <= 1) {
            paginationTop.innerHTML = "";
            paginationBottom.innerHTML = "";
            return;
        }

        // Prev
        if (currentPage > 1) {
            html += '<button class="page-btn" data-page="' + (currentPage - 1) + '">&laquo;</button>';
        }

        for (var i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                html += '<button class="page-btn active" data-page="' + i + '">' + i + '</button>';
            } else {
                html += '<button class="page-btn" data-page="' + i + '">' + i + '</button>';
            }
        }

        // Next
        if (currentPage < totalPages) {
            html += '<button class="page-btn" data-page="' + (currentPage + 1) + '">&raquo;</button>';
        }

        paginationTop.innerHTML = html;
        paginationBottom.innerHTML = html;
    }

    function onPageClick(e) {
        var btn = e.target.closest(".page-btn");
        if (!btn) return;
        currentPage = parseInt(btn.getAttribute("data-page"), 10);
        renderPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    paginationTop.addEventListener("click", onPageClick);
    paginationBottom.addEventListener("click", onPageClick);

    function update() {
        currentPage = 1;
        applyFilters();
        renderPage();
    }

    searchInput.addEventListener("input", update);

    tagButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var tag = btn.getAttribute("data-tag");
            if (activeTag === tag) {
                activeTag = null;
                btn.classList.remove("active");
            } else {
                activeTag = tag;
                tagButtons.forEach(function (b) { b.classList.remove("active"); });
                btn.classList.add("active");
            }
            update();
        });
    });

    cardGrid.addEventListener("click", function (e) {
        var btn = e.target.closest(".card-tag");
        if (!btn) return;
        var tag = btn.getAttribute("data-tag");
        if (activeTag === tag) {
            activeTag = null;
            tagButtons.forEach(function (b) { b.classList.remove("active"); });
        } else {
            activeTag = tag;
            tagButtons.forEach(function (b) {
                if (b.getAttribute("data-tag") === tag) {
                    b.classList.add("active");
                } else {
                    b.classList.remove("active");
                }
            });
        }
        update();
    });

    clearBtn.addEventListener("click", function () {
        searchInput.value = "";
        activeTag = null;
        tagButtons.forEach(function (btn) { btn.classList.remove("active"); });
        update();
    });

    // Init
    applyFilters();
    renderPage();
})();
