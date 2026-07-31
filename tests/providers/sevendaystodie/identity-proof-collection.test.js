const { EventEmitter } = require("node:events");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const ComponentState = require(
    "../../../src/core/ComponentState"
);
const SevenDaysToDieIdentityProofChatParser = require(
    "../../../src/providers/sevendaystodie/identity/" +
    "SevenDaysToDieIdentityProofChatParser"
);
const SevenDaysToDieIdentityProofCollector = require(
    "../../../src/providers/sevendaystodie/identity/" +
    "SevenDaysToDieIdentityProofCollector"
);
const SevenDaysToDieProvider = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieProvider"
);

const challenge = "RS-LINK-TEST-7F4K9M2Q";
const gameUserId = "Steam_76561198324839127";
const liveLine =
    "2026-07-30T22:30:57 8772.810 INF Chat " +
    "(from 'Steam_76561198324839127', entity id '171', " +
    "to 'Global'): 'RubbaDuckie': RS-LINK-TEST-7F4K9M2Q";

function createClient() {
    const socket = new EventEmitter();
    socket.write = () => true;

    return {
        ready: true,
        socket,
        connect: async () => {},
        disconnect: async () => {}
    };
}

test("parses the verified live challenge chat shape", () => {

    const parser = new SevenDaysToDieIdentityProofChatParser();
    const evidence = parser.parse(liveLine, {
        challenge,
        observedAt: 1000
    });

    assert.deepStrictEqual(evidence, {
        gameUserId,
        challenge,
        observedAt: 1000
    });
    assert.strictEqual(Object.isFrozen(evidence), true);
    assert.deepStrictEqual(Object.keys(evidence), [
        "gameUserId",
        "challenge",
        "observedAt"
    ]);

});

test("ignores unrelated, mismatched, and non-global chat", () => {

    const parser = new SevenDaysToDieIdentityProofChatParser();

    assert.strictEqual(parser.parse(
        liveLine.replace(challenge, "RS-LINK-TEST-OTHER1234"),
        { challenge, observedAt: 1000 }
    ), null);
    assert.strictEqual(parser.parse(
        liveLine.replace("to 'Global'", "to 'Party'"),
        { challenge, observedAt: 1000 }
    ), null);
    assert.strictEqual(parser.parse(
        "2026-07-30T22:30:57 8772.810 INF Time: private noise",
        { challenge, observedAt: 1000 }
    ), null);

});

test("collects one exact sanitized durable-ID challenge match", async () => {

    const client = createClient();
    const collector = new SevenDaysToDieIdentityProofCollector({
        client,
        clock: () => 2000,
        setTimer: () => ({ timer: true }),
        clearTimer: () => {}
    });
    const collection = collector.collect({
        challenge,
        gameUserId
    });

    client.socket.emit(
        "data",
        Buffer.from(`${liveLine}\r\n`, "utf8")
    );

    const evidence = await collection;

    assert.deepStrictEqual(evidence, [
        {
            gameUserId,
            challenge,
            observedAt: 2000
        }
    ]);
    assert.strictEqual(Object.isFrozen(evidence), true);
    assert.strictEqual(collector.isCollecting(), false);
    assert.strictEqual(client.socket.listenerCount("data"), 0);

});

test("fails closed for another durable identity", async () => {

    const client = createClient();
    let timeoutCallback = null;
    const collector = new SevenDaysToDieIdentityProofCollector({
        client,
        clock: () => 2000,
        setTimer: callback => {
            timeoutCallback = callback;
            return { timer: true };
        },
        clearTimer: () => {}
    });
    const collection = collector.collect({
        challenge,
        gameUserId: "Steam_11111111111111111"
    });

    client.socket.emit("data", `${liveLine}\n`);
    timeoutCallback();

    assert.deepStrictEqual(await collection, []);
    assert.strictEqual(collector.isCollecting(), false);

});

test("fails closed on timeout and disconnect", async () => {

    for (const endingEvent of ["timeout", "close"]) {
        const client = createClient();
        let timeoutCallback = null;
        const collector = new SevenDaysToDieIdentityProofCollector({
            client,
            setTimer: callback => {
                timeoutCallback = callback;
                return { timer: true };
            },
            clearTimer: () => {}
        });
        const collection = collector.collect({
            challenge,
            gameUserId
        });

        if (endingEvent === "timeout") {
            timeoutCallback();
        } else {
            client.socket.emit("close");
        }

        assert.deepStrictEqual(await collection, []);
        assert.strictEqual(collector.isCollecting(), false);
    }

});

test("serializes Provider commands and identity proof collection", async () => {

    const client = createClient();
    let commandActive = false;
    let collecting = false;
    const commandService = {
        executeCommand: async () => ({ ok: true }),
        isCommandActive: () => commandActive
    };
    const identityProofCollector = {
        collect: async request => Object.freeze([request]),
        isCollecting: () => collecting
    };
    const provider = new SevenDaysToDieProvider({
        client,
        commandService,
        identityProofCollector,
        configuration: {
            enabled: true,
            host: "localhost",
            port: 8081,
            connectionTimeoutMs: 1000
        },
        environment: {
            SEVEN_DAYS_TO_DIE_TELNET_PASSWORD: "private"
        }
    });

    provider.initialize();
    provider.state = ComponentState.RUNNING;

    collecting = true;
    await assert.rejects(
        provider.executeCommand("gettime"),
        /identity proof collection is active/u
    );

    collecting = false;
    commandActive = true;
    await assert.rejects(
        provider.collectIdentityProof({
            challenge,
            gameUserId
        }),
        /command execution is active/u
    );

    commandActive = false;
    assert.deepStrictEqual(
        await provider.collectIdentityProof({
            challenge,
            gameUserId
        }),
        [{ challenge, gameUserId }]
    );

});
