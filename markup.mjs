// defines markup-specific parsing stuff

import { add_test_group } from "./test.mjs";
import * as parser from "./parser.mjs";

class Node {
    constructor(type, value, param, attrs) {
        this.type = type;
        this.value = value;
        this.param = param;
        this.attrs = attrs || {};
    }
}
const text_node = (value) => new Node("text", value);
const closing_node = (name) => new Node("closing", name);
const open_node = (name, param, attrs) => new Node("open", name, param, attrs);

class Parameter {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }

    to_str() {
        return "" + this.value;
    }
}
const text_param = (value) => new Parameter("text", value);
const color_param = (value) => new Parameter("color", value);
const number_param = (value) => new Parameter("number", value);

class KeyValuePair {
    constructor(key, value) {
        this.key = key;
        this.value = value;
    }
}

function is_valid_color_name(color_name) {
    let s = new Option().style;
    s.color = color_name.toLowerCase();
    return s.color == color_name.toLowerCase();
}

const p_escape_sequence = parser.recognize(parser.all(
    '\\', parser.any('/', '[', ']')
));

const p_text = p_escape_sequence.or(
    parser.take_chars_while1((c) => c != '[' && c != '\\')
).map((c) => {
    return [text_node(c)];
});

const p_identifier = parser.recognize(
    parser.all(
        parser.regex(/^[a-zA-Z]/),
        parser.regex(/^[a-zA-Z0-9]*/)
    )
);

const p_param_string = parser.take_chars_while0((c) => c != '"').map(text_param);
const p_hex_color = parser.recognize(
    parser.all(
        '#',
        parser.regex(/^[0-9A-Fa-f]{6}/).or(/^[0-9A-Fa-f]{3}/)
    )
);
const p_color_name = parser.recognize(
    parser.all(
        parser.take_chars_while1((c) => /^[a-zA-Z#]/.test(c)),
        parser.take_chars_while0((c) => /^[a-zA-Z0-9#]/.test(c))
    )
).map((color_name) => {
    color_name = color_name.toLowerCase();
    if (!is_valid_color_name(color_name)) {
        color_name = 'black';
    }
    return color_name;
});

const p_param_color = p_hex_color.or(p_color_name).map(color_param);
const p_param_number = parser.regex(/^[0-9]+/).map(parseInt).map(number_param);

const p_whitespace0 = parser.regex(/^[ \t\n\r]*/);

const p_param = parser.preceded(
    parser.succeeded('=', p_whitespace0),
    parser.any(
        parser.delimited('"', p_param_string, '"'),
        p_param_color,
        p_param_number
    )
);

const p_kv_pair = parser.delimited(
    p_whitespace0,
    parser.all(
        parser.succeeded(p_identifier, p_whitespace0),
        parser.optional(p_param)
    ),
    p_whitespace0
).map((kv) => new KeyValuePair(kv[0], kv[1]));


const p_closing_tag = parser.delimited(
    '/',
    parser.delimited(
        p_whitespace0,
        p_identifier,
        p_whitespace0
    ),
    ']'
).map((text) => [closing_node(text)]);

const p_open_tag = parser.all(
    p_kv_pair,
    parser.zero_or_more(p_kv_pair),
    parser.any(
        parser.literal('/]').map((_) => true),
        parser.literal(']').map((_) => false)
    )
).map((parsed) => {
    const nodes = [
        open_node(
            parsed[0].key,
            parsed[0].value,
            parsed[1]
        )
    ];
    if (parsed[2]) {
        nodes.push(closing_node(parsed[0].name))
    }
    return nodes;
});

const p_tag = parser.preceded(
    '[',
    parser.any(
        p_closing_tag,
        p_open_tag
    )
);

const p_markup = parser.zero_or_more(parser.any(
    p_text,
    p_tag
)).map((node_lists) => {
    const nodes = [];
    for (let node_list of node_lists) {
        nodes.push(...node_list.matched);
    }
    return nodes;
});

export { p_markup };

add_test_group("markup", {
    text: (t) => {
        const result = p_text.parse("Hello, [world]!");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched[0].type, "text");
        t.assert_eq(result.value.matched[0].value, "Hello, ");
        t.assert_eq(result.value.start, 0);
        t.assert_eq(result.value.end, 7);
    },
    text_2: (t) => {
        const result = p_text.parse("Hello, ");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched[0].type, "text");
        t.assert_eq(result.value.matched[0].value, "Hello, ");
        t.assert_eq(result.value.start, 0);
        t.assert_eq(result.value.end, 7);
    },
    identifier_valid: (t) => {
        const result = p_identifier.parse("testidentifier");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "testidentifier");
    },
    identifier_valid_2: (t) => {
        const result = p_identifier.parse("t20");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "t20");
    },
    identifier_invalid: (t) => {
        const result = p_identifier.parse("20test");
        t.assert(result.is_ok());
        t.assert_eq(result.value, null);
    },
    param_string: (t) => {
        const result = p_param_string.parse('Hello "world');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.type, "text");
        t.assert_eq(result.value.matched.value, "Hello ");
    },
    hex_color_3: (t) => {
        const result = p_hex_color.parse('#fff');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "#fff");
    },
    hex_color_6: (t) => {
        const result = p_hex_color.parse('#ffffff');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "#ffffff");
    },
    hex_color_invalid_1: (t) => {
        const result = p_hex_color.parse('#gggggg');
        t.assert(result.is_ok());
        t.assert_eq(result.value, null);
    },
    hex_color_invalid_2: (t) => {
        const result = p_hex_color.parse('ffffff');
        t.assert(result.is_ok());
        t.assert_eq(result.value, null);
    },
    color_name_1: (t) => {
        const result = p_color_name.parse('red');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "red");
    },
    color_name_2: (t) => {
        const result = p_color_name.parse('beige');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "beige");
    },
    color_name_invalid: (t) => {
        const result = p_color_name.parse('foobar');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "black");
    },
    color_param: (t) => {
        const result = p_param_color.parse('#fff');
        t.assert(result.is_ok());
        t.assert(result.value.matched instanceof Parameter);
        t.assert_eq(result.value.matched.type, "color");
        t.assert_eq(result.value.matched.value, "#fff");
    },

    number_param: (t) => {
        const result = p_param_number.parse('800');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.type, "number");
        t.assert_eq(result.value.matched.value, 800);
    },

    param_1_number: (t) => {
        const result = p_param.parse('=800');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.type, "number");
        t.assert_eq(result.value.matched.value, 800);
    },
    param_2_text: (t) => {
        const result = p_param.parse('="800"');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.type, "text");
        t.assert_eq(result.value.matched.value, "800");
    },

    param_3_color: (t) => {
        const result = p_param.parse('=#fff');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.type, "color");
        t.assert_eq(result.value.matched.value, "#fff");
    },

    kv_pair: (t) => {
        const result = p_kv_pair.parse('id="test"');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.key, "id");
        t.assert_eq(result.value.matched.value.type, "text");
        t.assert_eq(result.value.matched.value.value, "test");
    },
    closing_tag: (t) => {
        const result = p_closing_tag.parse('/testo]')
        t.assert(result.is_ok());
        t.assert_ne(result.value.matched, null);
        t.assert_eq(result.value.matched[0].type, "closing");
        t.assert_eq(result.value.matched[0].value, "testo");
    },
    open_tag: (t) => {
        const result = p_open_tag.parse('testo]')
        t.assert(result.is_ok());
        t.assert_ne(result.value.matched, null);
        t.assert_eq(result.value.matched[0].type, "open");
        t.assert_eq(result.value.matched[0].value, "testo");
    },
    tag: (t) => {
        const result = p_tag.parse('[testo]');
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.length, 1);
        t.assert_ne(result.value.matched[0], null);
        t.assert_eq(result.value.matched[0].type, "open");
        t.assert_eq(result.value.matched[0].value, "testo");
    },
    tag_2: (t) => {
        const result = p_tag.parse('[testo=77 arg=#fff]');
        t.assert(result.is_ok());
        t.assert_ne(result.value.matched, null);
        t.assert_eq(result.value.matched.length, 1);
        t.assert_eq(result.value.matched[0].type, "open");
        t.assert_eq(result.value.matched[0].value, "testo");
        t.assert_eq(result.value.matched[0].param.value, 77);
        t.assert_eq(result.value.matched[0].attrs.length, 1);
        t.assert(result.value.matched[0].attrs[0].matched instanceof KeyValuePair);
        t.assert_eq(result.value.matched[0].attrs[0].matched.key, "arg");
        t.assert_eq(result.value.matched[0].attrs[0].matched.value.type, "color");
        t.assert_eq(result.value.matched[0].attrs[0].matched.value.value, "#fff");
    },
    markup_1: (t) => {
        const result = p_markup.parse('foobar[head=1]barbaz[/head]')
        t.assert(result.is_ok());
        t.assert_ne(result.value.matched, null);
        t.assert_eq(result.value.matched.length, 4);

        const nodes = result.value.matched;

        t.assert_eq(nodes[0].type, "text");
        t.assert_eq(nodes[0].value, "foobar");
        t.assert_eq(nodes[1].type, "open");
        t.assert_eq(nodes[1].value, "head");
        t.assert_eq(nodes[1].param.type, "number");
        t.assert_eq(nodes[1].param.value, 1);
        t.assert_eq(nodes[2].type, "text");
        t.assert_eq(nodes[2].value, "barbaz");
        t.assert_eq(nodes[3].type, "closing");
        t.assert_eq(nodes[3].value, "head");
    },
    markup_just_text: (t) => {
        const result = p_markup.parse('foobar')
        t.assert(result.is_ok());
    }
});