// Runs in the extension's isolated world on the page, injected by the popup
// together with jquery.js and jquery.highlight-3.js. The state lives here, not
// in the DOM, so the page itself cannot read or change it.
if (typeof window.fmsPage !== "object") {
    window.fmsPage = (function () {
        var TEXT = "#1f1f1f";
        // A thin dark edge so pale highlights still stand out on white pages
        var EDGE = "0 0 0 1px rgba(0, 0, 0, 0.35)";
        // Current match: dark ring inside a white ring, visible on light and dark pages
        var CURRENT = "0 0 0 2px #1f1f1f, 0 0 0 4px #ffffff";

        // {searchId, terms, colors, current} for the latest search, or null
        var state = null;
        // Colors stay with a term across searches until highlights are cleared
        var colorOf = {};
        var nextColor = 0;

        // !important so that site styles cannot hide the highlight.
        // Padding & margin are 0 to fix https://github.com/curiosity/Find-Many-Strings/issues/1
        function style(color) {
            return "background-color: " + color + " !important;" +
                "color: " + TEXT + " !important;" +
                "box-shadow: " + EDGE + " !important;" +
                "border-radius: 2px !important;" +
                "padding: 0px !important; margin: 0px !important;";
        }

        function pick_color(term, palette) {
            var key = term.toUpperCase();
            if (!(key in colorOf)) {
                colorOf[key] = palette[nextColor % palette.length];
                nextColor++;
            }
            return colorOf[key];
        }

        function matches(termIndex) {
            return document.querySelectorAll(
                'span.fms-highlight[data-fms-search="' + state.searchId + '"]' +
                '[data-fms-term="' + termIndex + '"]');
        }

        function summary() {
            if (!state) {
                return null;
            }
            return {
                terms: state.terms,
                colors: state.colors,
                current: state.current,
                counts: state.terms.map(function (term, i) {
                    return matches(i).length;
                })
            };
        }

        function show(termIndex, position) {
            var spans = matches(termIndex);
            state.current[termIndex] = position;

            var previous = document.querySelector("span.fms-current");
            if (previous) {
                previous.classList.remove("fms-current");
                previous.style.setProperty("box-shadow", EDGE, "important");
            }

            var span = spans[position - 1];
            span.classList.add("fms-current");
            span.style.setProperty("box-shadow", CURRENT, "important");
            span.scrollIntoView({block: "center"});
        }

        return {
            highlight: function (tokens, palette) {
                var searchId = String(Date.now());
                var colors = tokens.map(function (token) {
                    return pick_color(token, palette);
                });
                state = {
                    searchId: searchId,
                    terms: tokens,
                    colors: colors,
                    current: tokens.map(function () { return 0; })
                };
                for (var i = 0; i < tokens.length; i++) {
                    $(document.body).highlight(tokens[i], style(colors[i]), {
                        "data-fms-search": searchId,
                        "data-fms-term": i
                    });
                }

                // Show the last occurrence of the first search token
                var count = matches(0).length;
                if (count > 0) {
                    show(0, count);
                }
                return summary();
            },

            // Move to the next (direction 1) or previous (-1) match of a term, wrapping around
            step: function (termIndex, direction) {
                if (!state) {
                    return null;
                }
                var count = matches(termIndex).length;
                if (count > 0) {
                    var cur = state.current[termIndex];
                    var next;
                    if (cur < 1 || cur > count) {
                        next = direction > 0 ? 1 : count;
                    } else {
                        next = ((cur - 1 + direction + count) % count) + 1;
                    }
                    show(termIndex, next);
                }
                return summary();
            },

            clear: function () {
                $(document.body).removeHighlight();
                state = null;
                colorOf = {};
                nextColor = 0;
            },

            summary: summary
        };
    })();
}
