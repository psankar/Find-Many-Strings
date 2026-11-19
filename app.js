// Scripts that the highlight functions below depend on. They are injected
// into the active tab only when the user acts from the popup (activeTab).
var PAGE_LIBS = ["jquery.js", "jquery.highlight-3.js"];

function show_error(message) {
    var status = document.getElementById("status");
    status.textContent = message;
    status.hidden = false;
}

async function get_active_tab() {
    var tabs = await chrome.tabs.query({active: true, currentWindow: true});
    return tabs[0];
}

// The functions below are serialized and run inside the page, so they must
// not reference anything from this file. Search terms always travel as
// arguments, never as part of a code string.

function page_get_selection() {
    return window.getSelection().toString();
}

function page_highlight(tokens, styles) {
    for (var i = 0; i < tokens.length; i++) {
        $(document.body).highlight(tokens[i], styles[i]);
    }

    // Scroll such that the last occurrence of the first search token is visible
    var first = tokens[0].toUpperCase();
    var last = $("span.highlight").filter(function () {
        return this.textContent.toUpperCase() === first;
    }).last();
    if (last.length) {
        last[0].scrollIntoView({block: "center"});
    }
}

function page_clear() {
    $(document.body).removeHighlight();
}

async function run_in_page(func, args) {
    var tab = await get_active_tab();
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: PAGE_LIBS});
    await chrome.scripting.executeScript({target: {tabId: tab.id}, func: func, args: args || []});
}

function random_color() {

    var style = 'background: ';

    var r, g, b;

    r = Math.round(Math.random() * 0xFF);
    g = Math.round(Math.random() * 0xFF);
    b = Math.round(Math.random() * 0xFF);

    style += 'rgba(' + r + ',' + g + ',' + b + ',1);';

    /* The formula for calculating luminance is taken from
     * http://www.paciellogroup.com/resources/contrast-analyser.html
     *
     * If there are better methods to change, please let me know.
     */
     var luminance = (r * 299 + g * 587 + b * 114 ) / 1000;

     if (luminance < 125) {
        style += 'color: #FFFFFF';
    } else {
        style += 'color: #000000';
    }

    return style;
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

    var styles = tokens.map(random_color);

    try {
        await run_in_page(page_highlight, [tokens, styles]);
        window.close();
    } catch (e) {
        show_error("Cannot search on this page: " + e.message);
    }
}

async function hl_clear() {
    try {
        await run_in_page(page_clear);
        window.close();
    } catch (e) {
        show_error("Cannot clear highlights on this page: " + e.message);
    }
}

// Populate the search box with the text selected from the page
async function load_selection() {
    try {
        var tab = await get_active_tab();
        var results = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: page_get_selection
        });
        if (results && results[0] && results[0].result) {
            document.getElementById("t1").value = results[0].result;
        }
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

  load_selection();
});
