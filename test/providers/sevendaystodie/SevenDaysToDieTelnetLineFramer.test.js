const test = require("node:test");
const assert = require("node:assert/strict");

const SevenDaysToDieTelnetLineFramer = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieTelnetLineFramer"
);

test("frames split and combined CRLF and LF lines", () => {

    const framer = new SevenDaysToDieTelnetLineFramer();

    assert.deepEqual(
        framer.push("Day 1, 11:"),
        []
    );
    assert.equal(framer.getBufferedCharacterCount(), 13);

    const lines = framer.push(
        "40\r\nTotal of 1 in the game\npartial"
    );

    assert.deepEqual(lines, [
        "Day 1, 11:40",
        "Total of 1 in the game"
    ]);
    assert.equal(Object.isFrozen(lines), true);
    assert.equal(framer.getBufferedCharacterCount(), 7);

    assert.deepEqual(framer.push(" line\r\n"), ["partial line"]);
    assert.equal(framer.getBufferedCharacterCount(), 0);

});

test("preserves UTF-8 characters split across Buffer chunks", () => {

    const framer = new SevenDaysToDieTelnetLineFramer();
    const encoded = Buffer.from("Player café\r\n", "utf8");
    const split = encoded.indexOf(0xc3) + 1;

    assert.deepEqual(framer.push(encoded.subarray(0, split)), []);
    assert.deepEqual(
        framer.push(encoded.subarray(split)),
        ["Player café"]
    );

});

test("removes Telnet negotiation bytes across chunk boundaries", () => {

    const framer = new SevenDaysToDieTelnetLineFramer();

    assert.deepEqual(
        framer.push(Buffer.from([255, 251])),
        []
    );

    const lines = framer.push(Buffer.concat([
        Buffer.from([1]),
        Buffer.from("Day 1, 11:40\r\n", "utf8")
    ]));

    assert.deepEqual(lines, ["Day 1, 11:40"]);

});

test("removes Telnet subnegotiation and preserves escaped IAC data", () => {

    const framer = new SevenDaysToDieTelnetLineFramer();
    const chunk = Buffer.concat([
        Buffer.from("before", "utf8"),
        Buffer.from([255, 250, 24, 1, 2, 255, 240]),
        Buffer.from([255, 255]),
        Buffer.from("after\n", "utf8")
    ]);

    const lines = framer.push(chunk);

    assert.equal(lines.length, 1);
    assert.equal(
        lines[0],
        "before" + String.fromCharCode(255) + "after"
    );

});

test("bounds incomplete line buffering and resets after overflow", () => {

    const framer = new SevenDaysToDieTelnetLineFramer({
        maximumBufferedCharacters: 8
    });

    assert.deepEqual(framer.push("12345678"), []);
    assert.throws(
        () => framer.push("9"),
        /incomplete line exceeded the buffer limit/
    );
    assert.equal(framer.getBufferedCharacterCount(), 0);
    assert.deepEqual(framer.push("recovered\n"), ["recovered"]);

});

test("reset discards incomplete text and protocol state", () => {

    const framer = new SevenDaysToDieTelnetLineFramer();

    framer.push(Buffer.from([255, 251]));
    framer.push("discard this");
    framer.reset();

    assert.equal(framer.getBufferedCharacterCount(), 0);
    assert.deepEqual(framer.push("fresh\n"), ["fresh"]);

});

test("rejects invalid construction and chunk values", () => {

    assert.throws(
        () => new SevenDaysToDieTelnetLineFramer({
            maximumBufferedCharacters: 0
        }),
        /positive safe integer/
    );

    const framer = new SevenDaysToDieTelnetLineFramer();

    assert.throws(
        () => framer.push(null),
        /must be a Buffer or string/
    );

});
