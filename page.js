// Runs in the extension's isolated world on the page, injected by the popup
// together with jquery.js and jquery.highlight-3.js. The state lives here, not
// in the DOM, so the page itself cannot read or change it.
if (typeof window.fmsPage !== "object") {
    window.fmsPage = (function () {
        // {searchId, terms, styles, current} for the latest search, or null
        var state = null;

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
                styles: state.styles,
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
                previous.style.outline = "";
                previous.style.outlineOffset = "";
            }

            var span = spans[position - 1];
            span.classList.add("fms-current");
            // The outline takes the span's text color, which already contrasts with its background
            span.style.outline = "2px solid";
            span.style.outlineOffset = "1px";
            span.scrollIntoView({block: "center"});
        }

        return {
            highlight: function (tokens, styles) {
                var searchId = String(Date.now());
                state = {
                    searchId: searchId,
                    terms: tokens,
                    styles: styles,
                    current: tokens.map(function () { return 0; })
                };
                for (var i = 0; i < tokens.length; i++) {
                    $(document.body).highlight(tokens[i], styles[i], {
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
            },

            summary: summary
        };
    })();
}
