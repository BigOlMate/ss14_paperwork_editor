// takes the output from the markup parser and turns it into HTML
import {p_markup} from "./markup.mjs";
import {Span} from "./parser.mjs";

const known_tags = [
    {
        type: "head",
        param: "int",
        self_closing: false
    },
    {
        type: "color",
        param: "color",
        self_closing: false
    },
    {
        type: "bold",
        self_closing: false
    },
    {
        type: "italic",
        self_closing: false
    },
    {
        type: "bolditalic",
        self_closing: false
    },
    {
        type: "bullet",
        self_closing: true
    },
]

function verify_tag(node) {
    const errors = [];
    let found = false;
    for (let tag_info of known_tags) {
        if (node.value == tag_info.type) {
            found = true;
            if (node.type == "opening") {
                if (tag_info.self_closing && !node.was_self_closed) {
                    errors.push([
                        node.open_span,
                        `tag ${tag_info.type} should be self closed i.e. "[bullet/]" rather than "[bullet]"`
                    ]);
                }
                if (tag_info.param == null) {
                    if (node.param != null) {
                        errors.push([
                            node.open_span,
                            `tag ${tag_info.type} should not have a parameter`
                        ]);
                    }
                } else {
                    if (node.param == null) {
                        errors.push([
                            node.open_span,
                            `tag ${tag_info.type} should have a parameter`
                        ]);
                    } else if (tag_info === 'color') {
                        if (!is_valid_color_name(node.param) && !/#[0-9a-fA-F]{3}/.test(node.param) && !/#[0-9a-fA-F]{6}/.test(node.param)) {
                            errors.push([
                                node.open_span,
                                `invalid color parameter "${node.param}"`
                            ]);
                        }
                    } else if (tag_info === 'int') {
                        if (!/^[0-9]+$/.test(node.param)) {
                            errors.push([
                                node.open_span,
                                `invalid integer parameter "${node.param}"`
                            ]);
                        }
                    }
                }
            }
            break;
        }
    }
    if (!found) {
        errors.push([
            node.open_span,
            `unknown tag "${node.value}"`
        ]);
    }
    return errors;
}

class Node {
    constructor(span, type, value) {
        this.open_span = span;
        this.close_span = null;
        this.type = type;
        this.value = value;
        this.inner = [];
    }

    node_to_style(name, param) {
        switch (name) {
            case "color":
                return [null, `color: ${param}`];
            case "bold":
                return ['mu-bold', null];
            case "italic":
                return ['mu-italic', null];
            case "bolditalic":
                return ['mu-bold-italic', null];
            case "head":
                return [`mu-head-${param}`, null];
            case "bullet":
                return ["mu-bullet", null];
            default:
                return [null, null];
        }
    }

    to_html(lvl) {
        if (lvl==undefined) {
            lvl = 0;
        }
        let el = document.createElement("span");
        if (this.type == "bullet") {
            el.appendChild(document.createTextNode(" · "));
        }
        let [class_name, style] = this.node_to_style(this.type, this.value);
        if (class_name !== null) {
            el.classList.add(class_name);
        }
        if (style !== null) {
            el.style.cssText = style;
        }

        for (let child of this.inner) {
            if (typeof(child) == 'string') {
                let parts = child.split("\n");
                for (let i = 0; i < parts.length; i++) {
                    el.appendChild(document.createTextNode(parts[i]));
                    if (i != parts.length-1) {
                        el.appendChild(document.createElement("br"));
                    }
                }
            } else {
                console.log("Child", child);
                el.appendChild(child.to_html(lvl + 1));
            }
        }
        return el;
    }
}

export class HTMLifier {
    constructor() {
        this.stack = [new Node(new Span(0, 0), "root", null)];
        this.errors = [];
    }

    #add_text(span, text) {
        this.stack[this.stack.length-1].inner.push(text);
    }
    #add_opening(span, name, param) {
        if (param !== null) {
            param = param.to_str();
        }
        this.stack.push(new Node(span, name, param));
    }

    #_close_top_tag(span) {
        const t_node = this.stack.pop();
        t_node.close_span = span;
        this.stack[this.stack.length-1].inner.push(t_node);
    }

    #add_closing(span, name) {
        console.log(span, name);
        if (this.stack.length === 1) {
            // closing with none open?
            return;
        }
        if (this.stack[this.stack.length-1].type === name) {
            // simple case, properly closing tag
            this.#_close_top_tag(span);
            return;
        }
        // messy case, closes some other tag
        // we:
        //      1. try and find the right tag in stack
        //      2. close everything more recent than it
        //      3. close the found tag
        //      4. re-open all the more recent tags

        let found = null;

        for (let i = this.stack.length-1; i > 0; i--) {
            if (this.stack[i].type === name) {
                found = i;
                break;
            }
        }

        if (found === null) {
            // closing non-existing tag? bail out
            return;
        }

        let temp_closed_tags = [];
        while (this.stack.length > found + 1) {
            {
                let tag = this.stack[this.stack.length-1];
                temp_closed_tags.push([tag.open_span, tag.type, tag.param]);
            }
            this.#_close_top_tag();
        }
        // close the intended tag
        this.#_close_top_tag(span);

        temp_closed_tags = temp_closed_tags.reverse()
        // re-add all the tags we closed
        for (let item of temp_closed_tags) {
            this.stack.push(new Node(...item));
        }
    }

    #fix() {
        while (this.stack.length > 1) {
            const t_node = this.stack.pop();
            this.stack[this.stack.length-1].inner.push(t_node);
            this.errors.push([
                t_node.open_span,
                `tag '${t_node.type}' not properly closed`
            ]);
        }
    }

    #set_nodes(nodes) {
        this.stack = [new Node("root", null)];
        for (let node of nodes) {
            if (node.type == "text") {
                this.#add_text(node.span, node.value);
            } else if (node.type == "open") {
                this.errors.push(...verify_tag(node));
                this.#add_opening(node.span, node.value, node.param);
            } else if (node.type == "closing") {
                console.log(node);
                this.#add_closing(node.span, node.value);
            } else {
                console.error("bad node type added in HTMLifier", node);
            }
        }
    }

    set_markup(markup) {
        const parsed = p_markup.parse(markup);
        this.errors = [];
        this.#set_nodes(parsed.value.matched);
    }

    to_html() {
        this.#fix();
        return this.stack[0].to_html();
    }

    get_errors() {
        return this.errors;
    }
}