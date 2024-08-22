// takes the output from the markup parser and turns it into HTML

class Node {
    constructor(type, value) {
        this.type = type;
        this.value = value;
        this.inner = [];
    }

    node_to_style(name, param) {
        switch (name) {
            case "color":
                return [null, `color: ${param}`];
            case "head":
                return ['mu-head-' + param, null];
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

        console.log("-".repeat(lvl) + `${this.type}.to_html()`)
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
                el.appendChild(child.to_html(lvl + 1));
            }
        }
        return el;
    }
}

export class HTMLifier {
    constructor() {
        this.stack = [new Node("root", null)];
        this.phantom_tags = [];
    }

    add_text(text) {
        this.stack[this.stack.length-1].inner.push(text);
    }
    add_opening(name, param) {
        if (param !== null) {
            param = param.to_str();
        }
        this.stack.push(new Node(name, param));
    }

    _close_top_tag() {
        const t_node = this.stack.pop();
        const head = this.stack[this.stack.length-1];
        console.log(head, ".add_child", t_node);
        this.stack[this.stack.length-1].inner.push(t_node);
    }

    add_closing(name) {
        if (this.stack.length === 1) {
            // closing with none open?
            return;
        }
        if (this.stack[this.stack.length-1].type === name) {
            // simple case, properly closing tag
            this._close_top_tag();
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
                temp_closed_tags.push([tag.type, tag.param]);
            }
            this._close_top_tag();
        }
        // close the intended tag
        this._close_top_tag();

        temp_closed_tags = temp_closed_tags.reverse()
        // re-add all the tags we closed
        for (let item of temp_closed_tags) {
            this.stack.push(new Node(...item));
        }
    }

    fix() {
        while (this.stack.length > 1) {
            this._close_top_tag();
        }
    }

    to_html() {
        this.fix();
        return this.stack[0].to_html();
    }
}