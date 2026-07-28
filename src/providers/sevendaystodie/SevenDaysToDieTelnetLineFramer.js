const { StringDecoder } = require("node:string_decoder");

const TELNET = Object.freeze({
    IAC: 255,
    DONT: 254,
    DO: 253,
    WONT: 252,
    WILL: 251,
    SB: 250,
    SE: 240
});

const ParserState = Object.freeze({
    DATA: "DATA",
    IAC: "IAC",
    NEGOTIATION: "NEGOTIATION",
    SUBNEGOTIATION: "SUBNEGOTIATION",
    SUBNEGOTIATION_IAC: "SUBNEGOTIATION_IAC"
});

class SevenDaysToDieTelnetLineFramer {

    constructor({ maximumBufferedCharacters = 65536 } = {}) {

        if (
            !Number.isSafeInteger(maximumBufferedCharacters) ||
            maximumBufferedCharacters < 1
        ) {
            throw new Error(
                "7 Days to Die maximum buffered characters must be a " +
                "positive safe integer."
            );
        }

        this.maximumBufferedCharacters = maximumBufferedCharacters;
        this.decoder = new StringDecoder("utf8");
        this.lineBuffer = "";
        this.parserState = ParserState.DATA;

    }

    push(chunk) {

        const bytes = this.normalizeChunk(chunk);
        const payload = this.removeTelnetControlBytes(bytes);

        if (payload.length > 0) {
            this.lineBuffer += this.decoder.write(payload);
        }

        this.enforceBufferLimit();

        const lines = [];
        let newlineIndex = this.lineBuffer.indexOf("\n");

        while (newlineIndex !== -1) {
            let line = this.lineBuffer.slice(0, newlineIndex);
            this.lineBuffer = this.lineBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) {
                line = line.slice(0, -1);
            }

            lines.push(line);
            newlineIndex = this.lineBuffer.indexOf("\n");
        }

        this.enforceBufferLimit();

        return Object.freeze(lines);

    }

    getBufferedCharacterCount() {
        return this.lineBuffer.length;
    }

    reset() {

        this.decoder = new StringDecoder("utf8");
        this.lineBuffer = "";
        this.parserState = ParserState.DATA;

    }

    normalizeChunk(chunk) {

        if (Buffer.isBuffer(chunk)) {
            return chunk;
        }

        if (typeof chunk === "string") {
            return Buffer.from(chunk, "utf8");
        }

        throw new Error(
            "7 Days to Die Telnet line chunk must be a Buffer or string."
        );

    }

    removeTelnetControlBytes(bytes) {

        const output = [];

        for (const byte of bytes) {
            switch (this.parserState) {
                case ParserState.DATA:
                    if (byte === TELNET.IAC) {
                        this.parserState = ParserState.IAC;
                    } else {
                        output.push(byte);
                    }
                    break;
                case ParserState.IAC:
                    if (byte === TELNET.IAC) {
                        output.push(byte);
                        this.parserState = ParserState.DATA;
                    } else if (
                        byte === TELNET.DO ||
                        byte === TELNET.DONT ||
                        byte === TELNET.WILL ||
                        byte === TELNET.WONT
                    ) {
                        this.parserState = ParserState.NEGOTIATION;
                    } else if (byte === TELNET.SB) {
                        this.parserState = ParserState.SUBNEGOTIATION;
                    } else {
                        this.parserState = ParserState.DATA;
                    }
                    break;
                case ParserState.NEGOTIATION:
                    this.parserState = ParserState.DATA;
                    break;
                case ParserState.SUBNEGOTIATION:
                    if (byte === TELNET.IAC) {
                        this.parserState =
                            ParserState.SUBNEGOTIATION_IAC;
                    }
                    break;
                case ParserState.SUBNEGOTIATION_IAC:
                    this.parserState = byte === TELNET.SE
                        ? ParserState.DATA
                        : ParserState.SUBNEGOTIATION;
                    break;
                default:
                    throw new Error(
                        "7 Days to Die Telnet parser state is invalid."
                    );
            }
        }

        return Buffer.from(output);

    }

    enforceBufferLimit() {

        if (this.lineBuffer.length <= this.maximumBufferedCharacters) {
            return;
        }

        this.reset();
        throw new Error(
            "7 Days to Die Telnet incomplete line exceeded the buffer limit."
        );

    }

}

module.exports = SevenDaysToDieTelnetLineFramer;
