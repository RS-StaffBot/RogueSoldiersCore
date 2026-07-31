const IdentityMigrations = Object.freeze([
    Object.freeze({
        id: "006_create_identity_links",
        sql: `
            CREATE TABLE identity_links (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_user_id TEXT NOT NULL CHECK (
                    length(trim(discord_user_id)) > 0
                ),
                game_user_id TEXT NOT NULL CHECK (
                    game_user_id GLOB 'Steam_*' OR
                    game_user_id GLOB 'EOS_*'
                ),
                status TEXT NOT NULL CHECK (
                    status IN ('PENDING', 'VERIFIED', 'REVOKED')
                ),
                created_at TEXT NOT NULL CHECK (
                    length(trim(created_at)) > 0
                ),
                verified_at TEXT,
                revoked_at TEXT,
                CHECK (
                    (status = 'PENDING' AND
                        verified_at IS NULL AND
                        revoked_at IS NULL) OR
                    (status = 'VERIFIED' AND
                        verified_at IS NOT NULL AND
                        revoked_at IS NULL) OR
                    (status = 'REVOKED' AND
                        revoked_at IS NOT NULL)
                )
            ) STRICT;

            CREATE UNIQUE INDEX identity_links_active_discord
            ON identity_links(discord_user_id)
            WHERE status != 'REVOKED';

            CREATE UNIQUE INDEX identity_links_active_game
            ON identity_links(game_user_id)
            WHERE status != 'REVOKED';

            CREATE INDEX identity_links_discord_history
            ON identity_links(discord_user_id, sequence);

            CREATE INDEX identity_links_game_history
            ON identity_links(game_user_id, sequence)
        `
    })
]);

module.exports = IdentityMigrations;
