const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

const SevenDaysToDieCommandService = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandService"
);

class FakeSocket extends EventEmitter {

    constructor() {
        super();
        this.writes = [];
    }

    write(value) {
        this.writes.push(value);
    }
}

test("excludes stale startup banner lines from the first command result", async () => {

    const socket = new FakeSocket();
    const timers = [];
    const timestamps = [
        new Date("2026-07-28T03:24:12.388Z"),
        new Date("2026-07-28T03:24:12.437Z")
    ];
    const service = new SevenDaysToDieCommandService({
        client: {
            ready: true,
            socket
        },
        clearTimer: timer => {
            const index = timers.indexOf(timer);
            if (index >= 0) {
                timers.splice(index, 1);
            }
        },
        clock: () => timestamps.shift(),
        setTimer: callback => {
            const timer = { callback };
            timers.push(timer);
            return timer;
        }
    });

    const execution = service.executeCommand("gettime");

    assert.deepEqual(socket.writes, ["gettime\r\n"]);

    socket.emit("data", [
        "Server port: 26900\r\n",
        "Max players: 2\r\n",
        "Game mode:   GameModeSurvival\r\n",
        "World:       Navezgane\r\n",
        "Game name:   MyGame\r\n",
        "Difficulty:  1\r\n",
        "\r\n",
        "Press 'help' to get a list of all commands. ",
        "Press 'exit' to end session.\r\n",
        "\r\n",
        "2026-07-27T23:24:12 7422.722 INF Executing command ",
        "'gettime' by Telnet from 127.0.0.1:54741\r\n",
        "Day 1, 13:52\r\n"
    ].join(""));

    const result = await execution;

    assert.deepEqual(result.responseLines, [
        "2026-07-27T23:24:12 7422.722 INF Executing command " +
            "'gettime' by Telnet from 127.0.0.1:54741",
        "Day 1, 13:52"
    ]);
    assert.deepEqual(result.eventLines, []);
    assert.equal(result.status, "SUCCESS");
    assert.equal(result.completionReason, "MATCHED_RULE");
    assert.equal(result.truncated, false);
    assert.equal(timers.length, 0);

});
