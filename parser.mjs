// basic parser-combinator setup
//
// should be pretty self-explanatory for anyone familiar with parser-combinator
// based more or less on the rust library "nom"

import { add_test_group } from "./test.mjs";
import { ok, err, Result } from "./result.mjs";

class Span {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

class Match {
    constructor(matched, span, suppress) {
        this.matched = matched;
        this.span = span;
        if (suppress == undefined) {
            suppress = false;
        }
        this.suppressed = suppress;
    }

    with_start(start) {
        this.span.start = start;
        return this;
    }
    with_end(end) {
        this.span.end = end;
        return this;
    }
    with_span(span) {
        this.span = span;
        return this;
    }
    with_matched(matched) {
        this.matched = matched;
        return this;
    }

    suppress() {
        this.suppress = true;
        return this;
    }
}

function _as_parser(func) {
    if (func instanceof Parser) {
        return func;
    } else if (func instanceof RegExp) {
        return p_regex(func);
    } else if (typeof(func) == "string") {
        return p_literal(func);
    } else {
        return new Parser(func);
    }
}

class Parser {
    constructor(func) {
        this.func = func;
    }

    parse(text, offset) {
        if (offset == undefined) {
            offset = 0;
        }
        return this.func(text, offset);
    }

    map(func) {
        return p_map(this, func);
    }

    or(parser) {
        return p_any(this, parser);
    }
}

function p_literal(literal) {
    return new Parser(function(text, i) {
        const check_chunk = text.slice(i, i + literal.length);
        if (check_chunk == literal) {
            return ok(new Match(literal, new Span(i, i + literal.length)));
        } else {
            return ok(null);
        }
    })
}

function p_regex(regex) {
    return new Parser(function(text, i) {
        const match = regex.exec(text.slice(i));
        if (match === null) {
            return ok(null);
        } else {
            return ok(new Match(match[0], new Span(i, i + match[0].length)));
        }
    })
}

function p_preceded(parser_a, parser_b) {
    return new Parser(function(text, i) {
        const parser_a_result = _as_parser(parser_a).parse(text, i);
        if (parser_a_result.is_err()) {
            return parser_a_result;
        }
        if (parser_a_result.value === null) {
            return ok(null);
        }
        const parser_b_result = _as_parser(parser_b).parse(text, parser_a_result.value.span.end);
        if (parser_b_result.is_err()) {
            return parser_b_result;
        }
        if (parser_b_result.value === null) {
            return ok(null);
        }
        return ok(parser_b_result.value.with_start(i));
    })
}

function p_succeeded(parser_a, parser_b) {
    return new Parser(function(text, i) {
        const parser_a_result = _as_parser(parser_a).parse(text, i);
        if (parser_a_result.is_err()) {
            return parser_a_result;
        }
        if (parser_a_result.value === null) {
            return ok(null);
        }
        const parser_b_result = _as_parser(parser_b).parse(text, parser_a_result.value.span.end);
        if (parser_b_result.is_err()) {
            return parser_b_result;
        }
        if (parser_b_result.value === null) {
            return ok(null);
        }
        return ok(parser_a_result.value.with_end(parser_b_result.value.span.end));
    })
}

function p_delimited(parser_a, parser_b, parser_c) {
    return new Parser(function(text, i) {
        const parser_a_result = _as_parser(parser_a).parse(text, i);
        if (parser_a_result.is_err()) {
            return parser_a_result;
        }
        if (parser_a_result.value === null) {
            return ok(null);
        }
        const parser_b_result = _as_parser(parser_b).parse(text, parser_a_result.value.span.end);
        if (parser_b_result.is_err()) {
            return parser_b_result;
        }
        if (parser_b_result.value === null) {
            return ok(null);
        }
        const parser_c_result = _as_parser(parser_c).parse(text, parser_b_result.value.span.end)
        if (parser_c_result.is_err()) {
            return parser_c_result;
        }
        if (parser_c_result.value === null) {
            return ok(null);
        }
        return ok(
            parser_b_result.value.with_span(new Span(parser_a_result.value.span.start, parser_c_result.value.span.end))
        );
    })
}

function p_all(...parsers) {
    return new Parser(function(text, i) {
        let result = [];
        let start = i;
        for (let parser of parsers) {
            const parser_result = _as_parser(parser).parse(text, start);
            if (parser_result.is_err()) {
                return parser_result;
            }
            if (parser_result.value === null) {
                return ok(null);
            }
            if (!parser_result.value.suppressed) {
                result.push(parser_result.value.matched);
            }
            start = parser_result.value.span.end;
        }
        return ok(new Match(result, new Span(i, start)));
    })
}

function p_any(...parsers) {
    return new Parser(function(text, i) {
        for (let parser of parsers) {
            const parser_result = _as_parser(parser).parse(text, i);
            if (parser_result.is_err()) {
                return parser_result;
            }
            if (parser_result.value !== null) {
                return parser_result;
            }
        }
        return ok(null);
    })
}

function p_optional(parser, default_value) {
    if (default_value === undefined) {
        default_value = null;
    }
    return new Parser(function(text, i) {
        const parser_result = _as_parser(parser).parse(text, i);
        if (parser_result.is_err()) {
            return parser_result;
        }
        if (parser_result.value === null) {
            return ok(new Match(default_value, new Span(i, i)));
        }
        return parser_result;
    })
}

function p_one_or_more(parser) {
    return new Parser(function(text, i) {
        let result = [];
        let start = i;
        while (true) {
            const parser_result = _as_parser(parser).parse(text, start);
            if (parser_result.is_err()) {
                return parser_result;
            }
            if (parser_result.value === null) {
                break;
            }
            result.push(parser_result.value);
            start = parser_result.value.span.end;

            if (start == text.length) {
                break;
            }
        }
        if (result.length == 0) {
            return ok(null);
        } else {
            return ok(new Match(result, new Span(i, start)));
        }
    })
}
function p_zero_or_more(parser) {
    return p_optional(p_one_or_more(parser), []);
}

function p_take_chars_while1(predicate) {
    return new Parser(function(text, i) {
        let result = [];
        let start = i;
        while (start < text.length && predicate(text.charAt(start))) {
            result.push(text.charAt(start));
            start++;
        }
        if (result.length == 0) {
            return ok(null);
        } else {
            return ok(new Match(result.join(''), new Span(i, start)));
        }
    })
}
function p_take_chars_while0(predicate) {
    return new Parser(function(text, i) {
        let result = [];
        let start = i;
        while (start < text.length && predicate(text.charAt(start))) {
            result.push(text.charAt(start));
            start++;
        }
        return ok(new Match(result.join(''), new Span(i, start)));
    })
}

function p_map(parser, func) {
    return new Parser(function(text, i) {
        const parser_result = _as_parser(parser).parse(text, i);
        if (parser_result.is_err()) {
            return parser_result;
        }
        if (parser_result.value === null) {
            return ok(null);
        }
        let result = func(parser_result.value.span, parser_result.value.matched);
        if (result instanceof Result) {
            if (result.is_err()) {
                return result;
            }
            result = result.value
        }
        return ok(parser_result.value.with_matched(result));
    })
}

function p_recognize(parser) {
    return new Parser(function(text, i) {
        const parser_result = _as_parser(parser).parse(text, i);
        if (parser_result.is_err()) {
            return parser_result;
        }
        if (parser_result.value === null) {
            return ok(null);
        }
        return ok(new Match(
            text.slice(parser_result.value.span.start, parser_result.value.span.end),
            parser_result.value.span));
    })
}

add_test_group("parser", {
    literal_start: (t) => {
            const parser = p_literal("hello");
            const result = parser.parse("hello world");
            t.assert(result.is_ok());
            t.assert_eq(result.value.matched, "hello");
            t.assert_eq(result.value.span.start, 0);
            t.assert_eq(result.value.span.end, 5);
    },
    literal_mid: (t) => {
        const parser = p_literal("world");
        const result = parser.parse("hello world", 6);
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "world");
        t.assert_eq(result.value.span.start, 6);
        t.assert_eq(result.value.span.end, 11);
    },
    regex: (t) => {
        const parser = p_regex(/^hello/);
        const str = "hello world";
        const result = parser.parse(str);
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "hello");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 5);
        t.assert_eq(str.slice(result.value.span.end), " world");
    },

    all: (t) => {
        const parser = p_all(p_literal("hello "), p_literal("world"));
        const str = "hello world";
        const result = parser.parse(str);
        t.assert(result.is_ok());
        t.assert_array_eq(result.value.matched, ["hello ", "world"]);
    },

    any: (t) => {
        const parser = p_any(p_literal("world"), p_literal("hello"));
        const str = "hello world";
        const result = parser.parse(str);
        t.assert(result.is_ok());
        t.assert_ne(result.value, null);
        t.assert_eq(result.value.matched, "hello");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 5);
    },

    preceded: (t) => {
        const parser = p_preceded(p_literal("hello "), p_literal("world"));
        const str = "hello world";
        const result = parser.parse(str);
        t.assert(result.is_ok());
        t.assert_ne(result.value, null);
        t.assert_eq(result.value.matched, "world");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 11);
        t.assert_eq(str.slice(result.value.span.end), "");
    },
    succeeded: (t) => {
        const parser = p_succeeded(p_literal("hello "), p_literal("world"));
        const str = "hello world";
        const result = parser.parse(str);
        t.assert(result.is_ok());
        t.assert_ne(result.value, null);
        t.assert_eq(result.value.matched, "hello ");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 11);
        t.assert_eq(str.slice(result.value.span.end), "");
    },
    delimited: (t) => {
        const parser = p_delimited(p_literal("hello"), p_literal(" "), p_literal("world"));
        const str = "hello world";
        const result = parser.parse(str);
        t.assert(result.is_ok());
        t.assert_ne(result.value, null);
        t.assert_eq(result.value.matched, " ");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 11);
        t.assert_eq(str.slice(result.value.span.end), "");
    },
    optional_none: (t) => {
        const parser = p_optional(p_literal("hello"));
        const result = parser.parse("world");
        t.assert(result.is_ok());
        t.assert_ne(result.value, null);
        t.assert_eq(result.value.matched, null);
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 0);
    },
    optional_some: (t) => {
            const parser = p_optional(p_literal("hello"));
            const result = parser.parse("hello");
            t.assert(result.is_ok());
            t.assert_ne(result.value, null);
            t.assert_eq(result.value.matched, "hello");
            t.assert_eq(result.value.span.start, 0);
            t.assert_eq(result.value.span.end, 5);
    },

    one_or_more_more: (t) => {
        const parser = p_one_or_more(p_literal("hello "));
        const result = parser.parse("hello hello world");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.length, 2);
        t.assert_eq(result.value.matched[0].matched, "hello ");
        t.assert_eq(result.value.matched[1].matched, "hello ");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 12);
    },
    one_or_more_one: (t) => {
        const parser = p_one_or_more(p_literal("hello "));
        const result = parser.parse("hello world");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.length, 1);
        t.assert_eq(result.value.matched[0].matched, "hello ");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 6);
    },
    one_or_more_none: (t) => {
        const parser = p_one_or_more(p_literal("hello "));
        const result = parser.parse("world");
        t.assert(result.is_ok());
        t.assert_eq(result.value, null);
    },
    zero_or_more_more: (t) => {
        const parser = p_zero_or_more(p_literal("hello "));
        const result = parser.parse("hello hello world");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.length, 2);
        t.assert_eq(result.value.matched[0].matched, "hello ");
        t.assert_eq(result.value.matched[1].matched, "hello ");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 12);
    },
    zero_or_more_one: (t) => {
        const parser = p_zero_or_more(p_literal("hello "));
        const result = parser.parse("hello world");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.length, 1);
        t.assert_eq(result.value.matched[0].matched, "hello ");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 6);
    },
    zero_or_more_none: (t) => {
        const parser = p_zero_or_more(p_literal("hello "));
        const result = parser.parse("world");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched.length, 0);
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 0);
    },
    take_chars_while0: (t) => {
        const parser = p_take_chars_while0((c) => c != " ");
        const result = parser.parse("hello world");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "hello");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 5);
    },
    take_chars_while1: (t) => {
        const parser = p_take_chars_while1((c) => c != " ");
        const result = parser.parse("hello world");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "hello");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 5);
    },
    map: (t) => {
        const parser = p_map(p_literal("hello"), (span, s) => s.toUpperCase());
        const result = parser.parse("hello world");
        t.assert(result.is_ok());
        t.assert_eq(result.value.matched, "HELLO");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 5);
    },
    recognize: (t) => {
        const parser = p_recognize(p_delimited(p_literal("hello"), p_literal(" "), p_literal("world")));
        const str = "hello world";
        const result = parser.parse(str);
        t.assert(result.is_ok());
        t.assert_ne(result.value, null);
        t.assert_eq(result.value.matched, "hello world");
        t.assert_eq(result.value.span.start, 0);
        t.assert_eq(result.value.span.end, 11);
        t.assert_eq(str.slice(result.value.span.end), "");
    },
});


export {
    Parser,
    Span,
    p_literal as literal,
    p_regex as regex,
    p_all as all,
    p_any as any,
    p_preceded as preceded,
    p_succeeded as succeeded,
    p_delimited as delimited,
    p_one_or_more as one_or_more,
    p_zero_or_more as zero_or_more,
    p_optional as optional,
    p_take_chars_while0 as take_chars_while0,
    p_take_chars_while1 as take_chars_while1,
    p_map as map,
    p_recognize as recognize,
}