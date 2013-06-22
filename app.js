// Populate the search box with the text selected from the page
chrome.tabs.getSelected(null, function(tab) {
    chrome.tabs.sendRequest(tab.id, {method: "getSelection"}, function (response) {
        $("#t1").val(response.data);
    });
});

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

function search(that) {
    var token = new String (t1.value);

    chrome.tabs.executeScript(null,
        {code:"$(document.body).highlight('"+token+"','"+random_color()+"')"});

    window.close();
}

function hl_clear(that) {
    chrome.tabs.executeScript(null,
        {code:"$(document.body).removeHighlight()"});

    window.close();
}

function handle_keypress() {
    if ( event.which == 13 ) {
        $("#search_btn").click();
    }
}

document.addEventListener('DOMContentLoaded', function () {
  var searchButton = document.getElementById('search_btn');
  searchButton.addEventListener('click', search);

  var clearButton = document.getElementById('clear_btn');
  clearButton.addEventListener('click', hl_clear);

  var searchQuery = document.getElementById('t1');
  searchQuery.addEventListener('keypress', handle_keypress);
});