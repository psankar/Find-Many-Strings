// Scripts that the page side of the extension needs. They are injected into
// the active tab only when the user acts from the popup (activeTab).
var PAGE_LIBS = ["jquery.js", "jquery.highlight-3.js", "page.js"];

function show_error(message) {
    var status = document.getElementById("status");
    status.textContent = message;
    status.hidden = false;
}

async function get_active_tab() {
    var tabs = await chrome.tabs.query({active: true, currentWindow: true});
    return tabs[0];
}

// Runs func(...args) in the page and returns its result. func is serialized,
// so it must not reference anything from this file; search terms always
// travel as arguments, never as part of a code string.
async function run_in_page(func, args, inject) {
    var tab = await get_active_tab();
    if (inject) {
        var loaded = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: function () { return typeof window.fmsPage === "object"; }
        });
        if (!loaded[0].result) {
            await chrome.scripting.executeScript({target: {tabId: tab.id}, files: PAGE_LIBS});
        }
    }
    var results = await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: func,
        args: args || []
    });
    return results[0].result;
}

// Highlight colors, used in this order. All are light enough for the dark
// highlight text (#1f1f1f) to read at 6.9:1 or better, and stand out
// strongly on dark pages; a thin dark edge covers white pages.
var PALETTE = [
    "#FFE066", // yellow
    "#9AD0F5", // blue
    "#F7A1C4", // pink
    "#A8E6A1", // green
    "#FFB870", // orange
    "#C9B6F2", // purple
    "#8FE3D6", // teal
    "#F28B82"  // red
];

// One row per search term: the term in its highlight color, ▲ ▼ and "n / total"
function render_terms(summary) {
    var list = document.getElementById("terms");
    list.textContent = "";
    if (!summary) {
        return;
    }

    summary.terms.forEach(function (term, i) {
        var row = document.createElement("div");
        row.className = summary.counts[i] === 0 ? "term zero" : "term";

        var chip = document.createElement("span");
        chip.className = "chip";
        chip.style.backgroundColor = summary.colors[i];
        chip.textContent = term;
        chip.title = term;

        var up = document.createElement("button");
        up.className = "arrow";
        up.textContent = "▲";
        up.title = "Previous match";
        up.addEventListener("click", function () { step(i, -1); });

        var down = document.createElement("button");
        down.className = "arrow";
        down.textContent = "▼";
        down.title = "Next match";
        down.addEventListener("click", function () { step(i, 1); });

        var count = document.createElement("span");
        count.className = "count";
        var total = summary.counts[i];
        var current = summary.current[i];
        if (total === 0) {
            count.textContent = "0 found";
            up.disabled = down.disabled = true;
        } else {
            count.textContent = (current > 0 ? current : "–") + " / " + total;
        }

        row.append(chip, up, down, count);
        list.appendChild(row);
    });
}

async function step(termIndex, direction) {
    try {
        render_terms(await run_in_page(
            function (i, d) { return window.fmsPage ? window.fmsPage.step(i, d) : null; },
            [termIndex, direction]));
    } catch (e) {
        show_error("Cannot move between matches on this page: " + e.message);
    }
}

async function search() {
    var inputText = document.getElementById("t1").value;

    // In case someone removed the delimiter, assume "," to be the default delim
    var delimToken = document.getElementById("delim").value || ",";

    // Empty tokens (e.g. from "a,,b" or a trailing delimiter) would match everywhere
    var tokens = inputText.split(delimToken).filter(function (token) {
        return token.length > 0;
    });
    if (tokens.length === 0) {
        return;
    }

    try {
        render_terms(await run_in_page(
            function (t, p) { return window.fmsPage.highlight(t, p); },
            [tokens, PALETTE], true));
    } catch (e) {
        show_error("Cannot search on this page: " + e.message);
    }
}

async function hl_clear() {
    try {
        await run_in_page(function () {
            if (window.fmsPage) {
                window.fmsPage.clear();
            }
        });
        window.close();
    } catch (e) {
        show_error("Cannot clear highlights on this page: " + e.message);
    }
}

// Populate the search box with the text selected from the page, and show the
// terms of the last search on this page, if any
async function load_page_state() {
    try {
        var state = await run_in_page(function () {
            return {
                selection: window.getSelection().toString(),
                summary: window.fmsPage ? window.fmsPage.summary() : null
            };
        });
        var input = document.getElementById("t1");
        if (state.selection) {
            input.value = state.selection;
            // Selected, so typing replaces it
            input.select();
        }
        render_terms(state.summary);
    } catch (e) {
        // Pages such as chrome:// URLs and the Web Store cannot be scripted
        show_error("This page cannot be searched by extensions.");
    }
}

function handle_keypress(event) {
    if (event.key === "Enter") {
        search();
    }
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('search_btn').addEventListener('click', search);
  document.getElementById('clear_btn').addEventListener('click', hl_clear);
  document.getElementById('t1').addEventListener('keypress', handle_keypress);
  document.getElementById('delim').addEventListener('keypress', handle_keypress);

  load_page_state();
});
