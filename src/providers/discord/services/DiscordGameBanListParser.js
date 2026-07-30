const BAN_LIST_HEADER = "Ban list entries:";
const BAN_LIST_COLUMNS = "Banned until - UserID (name) - Reason";
const BAN_ENTRY_PATTERN =
    /^\s*\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} - ((?:Steam_[1-9]\d{0,19}|EOS_[A-Za-z0-9]{16,64})) \((.*)\) - (.*)$/u;

class DiscordGameBanListParser {

    parse(result) {
        if (!result || !Array.isArray(result.responseLines)) {
            return null;
        }

        const headerIndex = result.responseLines.findIndex(line =>
            line === BAN_LIST_HEADER
        );

        if (headerIndex < 0) {
            return null;
        }

        const columnsIndex = result.responseLines.findIndex(
            (line, index) =>
                index > headerIndex &&
                typeof line === "string" &&
                line.trim() === BAN_LIST_COLUMNS
        );

        if (columnsIndex < 0) {
            return null;
        }

        const entries = [];

        for (
            let index = columnsIndex + 1;
            index < result.responseLines.length;
            index += 1
        ) {
            const line = result.responseLines[index];

            if (typeof line !== "string") {
                return null;
            }

            if (line.length === 0) {
                continue;
            }

            const match = BAN_ENTRY_PATTERN.exec(line);

            if (!match) {
                return null;
            }

            entries.push(Object.freeze({
                displayName: match[2],
                reason: match[3],
                userId: match[1]
            }));
        }

        return Object.freeze({
            entries: Object.freeze(entries)
        });
    }

    findUniqueByDisplayName(list, displayName) {
        if (
            !list ||
            !Array.isArray(list.entries) ||
            typeof displayName !== "string"
        ) {
            return Object.freeze({
                entry: null,
                status: "INVALID_LIST"
            });
        }

        const matches = list.entries.filter(entry =>
            entry && entry.displayName === displayName
        );

        if (matches.length === 0) {
            return Object.freeze({
                entry: null,
                status: "NOT_FOUND"
            });
        }

        if (matches.length > 1) {
            return Object.freeze({
                entry: null,
                status: "AMBIGUOUS"
            });
        }

        return Object.freeze({
            entry: matches[0],
            status: "FOUND"
        });
    }

    containsUserId(list, userId) {
        return Boolean(
            list &&
            Array.isArray(list.entries) &&
            typeof userId === "string" &&
            list.entries.some(entry => entry && entry.userId === userId)
        );
    }

}

module.exports = DiscordGameBanListParser;
