/*

highlight v3

Highlights arbitrary terms.

<http://johannburkard.de/blog/programming/javascript/highlight-javascript-text-higlighting-jquery-plugin.html>

MIT license.

Johann Burkard
<http://johannburkard.de>
<mailto:jb@eaio.com>

Modified for Find Many Strings: uses the "fms-highlight" class so that the
page's own ".highlight" elements are never touched, and accepts extra data
attributes so each match can be tied to its search term.

*/

// style is the complete inline style for each highlight span
jQuery.fn.highlight = function(pat, style, attrs) {
 function innerHighlight(node, pat, style) {
  var skip = 0;
  if (node.nodeType == 3) {
   var pos = node.data.toUpperCase().indexOf(pat);
   if (pos >= 0) {
    var spannode = document.createElement('span');
    spannode.className = 'fms-highlight';
    spannode.setAttribute('style', style);
    for (var name in attrs) {
     spannode.setAttribute(name, attrs[name]);
    }
    var middlebit = node.splitText(pos);
    var endbit = middlebit.splitText(pat.length);
    var middleclone = middlebit.cloneNode(true);
    spannode.appendChild(middleclone);
    middlebit.parentNode.replaceChild(spannode, middlebit);
    skip = 1;
   }
  }
  else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
   for (var i = 0; i < node.childNodes.length; ++i) {
    i += innerHighlight(node.childNodes[i], pat, style);
   }
  }
  return skip;
 }
 return this.each(function() {
  innerHighlight(this, pat.toUpperCase(), style);
 });
};

jQuery.fn.removeHighlight = function() {
 return this.find("span.fms-highlight").each(function() {
  var parent = this.parentNode;
  parent.replaceChild(document.createTextNode(this.textContent), this);
  parent.normalize();
 }).end();
};
