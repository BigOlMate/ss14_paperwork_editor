const groups = [];

function dbg(v) {
    return JSON.stringify(v);
}

const test_funcs = {
    assert: (a) => {
        if (a !== true) {
            throw new Error(`Assertion failed: ${dbg(a)}`);
        }
    },
    assert_array_eq: (a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b)) {
            throw new Error(`Assertion failed: ${dbg(a)} is not an array`);
        }
        if (a.length !== b.length) {
            throw new Error(`Assertion failed: arrays have different lengths: ${dbg(a.length)} vs ${dbg(b.length)}`);
        }
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                throw new Error(`Assertion failed: arrays differ at index ${i}: ${dbg(a[i])} vs ${dbg(b[i])}`);
            }
        }
    },
    assert_array_ne: (a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b)) {
            throw new Error(`Assertion failed: ${dbg(a)} is not an array`);
        }
        if (a.length !== b.length) {
            return;
        }
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return;
            }
        }
        throw new Error(`Assertion failed: arrays are equal: ${dbg(a.length)} vs ${dbg(b.length)}`);
    },
    assert_eq: (a, b) => {
        if (a !== b) {
            throw new Error(`Assertion failed: ${dbg(a)} !== ${dbg(b)}`);
        }
    },
    assert_ne: (a, b) => {
        if (a === b) {
            throw new Error(`Assertion failed: ${dbg(a)} === ${dbg(b)}`);
        }
    },
    assert_gt: (a, b) => {
        if (a <= b) {
            throw new Error(`Assertion failed: ${dbg(a)} <= ${dbg(b)}`);
        }
    },
    assert_lt: (a, b) => {
        if (a >= b) {
            throw new Error(`Assertion failed: ${dbg(a)} >= ${dbg(b)}`);
        }
    },
    assert_ge: (a, b) => {
        if (a < b) {
            throw new Error(`Assertion failed: ${dbg(a)} < ${dbg(b)}`);
        }
    },
    assert_le: (a, b) => {
        if (a > b) {
            throw new Error(`Assertion failed: ${dbg(a)} > ${dbg(b)}`);
        }
    },
    fail: (message) => {
        throw new Error(`Test failed: ${message}`);
    }
};

class TestGroup {
    constructor(name) {
        this.name = name;
        this.tests = [];
    }

    add_test(name, func) {
        this.tests.push({ name, func });
    }
}

export function add_test_group(name, tests) {
    const grp = new TestGroup(name);
    groups.push(grp);

    for (let [name, func] of Object.entries(tests)) {
        grp.add_test(name, func);
    }
    return grp;
}

export function run_tests() {
    let total_pass = 0;
    let total_fail = 0;
    for (let grp of groups) {
        console.log(`Running tests for ${grp.name}:`);
        let group_pass = 0;
        let group_fail = 0;
        for (let test of grp.tests) {
            try {
                test.func(test_funcs);
                console.log(`  - ${test.name}: passed`);
                group_pass += 1;
            } catch (error) {
                console.log(`  - ${test.name}: failed`);
                console.error(error);
                group_fail += 1;
            }
        }
        console.log(`  ${group_pass} passed, ${group_fail} failed`);
        console.log("");
        total_pass += group_pass;
        total_fail += group_fail; 
    }
    console.log("Summary");
    console.log(` ${total_pass} passed`);
    console.log(` ${total_fail} failed`);
}
