const MAX_PAGE_CONTENT_LENGTH = 6000;

import {p_markup} from "./markup.mjs";
import { HTMLifier } from "./htmlifier.mjs";
import "./run_tests.mjs";

const editor = document.getElementById("paperwork_editor");
const viewer = document.getElementById("paperwork_viewer");
console.log("editor", editor);

function set_html() {
    let parsed = p_markup.parse(editor.value);
    let html = new HTMLifier();
    for (let node of parsed.value.matched) {
        if (node.type == "text") {
            html.add_text(node.value);
        } else if (node.type == "open") {
            html.add_opening(node.value, node.param);
        } else if (node.type == "closing") {
            html.add_closing(node.value);
        }
    }
    viewer.innerHTML = "";
    viewer.appendChild(html.to_html());
}

editor.addEventListener('input', function(ev) {
    set_html();
});
set_html();


const department_color_map = [
    ["#cb0000", "Security"],
    ["#c96dbf", "Science"],
    ["#5b97bc", "Medical"],
    ["#b18644", "Cargo"],
    ["#f39f27", "Engineering"],
    ["#ff2fff", "Clown"],
    ["#9fed58", "Service"],
    ["#6e6e6e", "Passenger"],
    ["#1b67a5", "Command"],
    ["#009100", "CentCom"],
    ["#134975", "NanoTrasen"],
    ["#ff0000", "Syndicate"],
];

const dep_colors = document.getElementsByClassName("dep-colors")[0];

for (let [color, depname] of department_color_map) {
    let row = document.createElement("tr");
    let cell1 = document.createElement("td");
    cell1.innerText = depname;
    let cell2 = document.createElement("td");
    cell2.innerText = color;
    row.appendChild(cell1);
    row.appendChild(cell2);
    dep_colors.appendChild(row);


    row.style.background = color;
    let [r, g, b] = row.style.background.match(/(\d+), (\d+), (\d+)/);
    r = parseInt(r);
    g = parseInt(g);
    b = parseInt(b);

    if (r+g+b > 255*3/2) {
        row.style.color = "black";
    } else {
        row.style.color = "white";
    }
}