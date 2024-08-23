const MAX_PAGE_CONTENT_LENGTH = 6000;

import { HTMLifier } from "./htmlifier.mjs";
import "./run_tests.mjs";

const editor = document.getElementById("paperwork_editor");
const viewer = document.getElementById("paperwork_viewer");
const htmlifier = new HTMLifier();

function set_html() {
    htmlifier.set_markup(editor.value);
    viewer.innerHTML = "";
    viewer.appendChild(htmlifier.to_html());
    console.log("tag errors: ", htmlifier.get_errors());
}

editor.addEventListener('input', function(ev) {
    set_html();
});
set_html();


const department_color_map = [
    ["", "Space Station"],
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
    ["", "Frontier Station"],
    ["#cc6633", "STC"],
    ["#0033cc", "Station Rep"],
];

const dep_colors = document.getElementsByClassName("dep-colors")[0];

for (let [color, depname] of department_color_map) {
    if (color === "") {
        let row = document.createElement("tr");
        let cell = document.createElement("td");
        cell.colSpan = 2;
        cell.innerText = depname;
        row.appendChild(cell);
        dep_colors.appendChild(row);
        continue;
    }


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