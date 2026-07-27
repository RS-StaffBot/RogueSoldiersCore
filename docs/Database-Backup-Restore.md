# Database Backup and Restore

## Purpose

This runbook defines the supported production backup and restore procedure for the Rogue Soldiers Framework SQLite database.

The default tracked database location is:

```text
data/rogue-soldiers.sqlite3
```

The active location is controlled by `config/core/database.json`.

## Important Rules

- Stop the Rogue Soldiers Framework before copying or replacing the database.
- Do not back up only the main SQLite file while the process is running.
- Do not edit the database manually during backup or restore.
- Keep backups outside the repository and outside the active `data` directory.
- Protect backups because they may contain Discord user IDs, moderation records, economy balances, tickets, and other community data.
- Never commit database files or backups to Git. The repository ignores `data/`, `*.db`, `*.sqlite`, and `*.sqlite3`.

The database uses SQLite WAL mode during normal file-backed operation. Stopping RSF first allows the connection to close cleanly and prevents an inconsistent copy involving the main database, WAL, or shared-memory files.

## Backup Frequency

Use a schedule appropriate for the amount of data the community can afford to lose.

Recommended minimum:

- Daily automated backup
- Additional backup before upgrades, migrations, or configuration changes that could affect stored data
- Keep several recent copies rather than overwriting one file
- Keep at least one copy on a different disk or protected backup destination

## Create a Backup

Run these commands from the repository root in PowerShell.

### 1. Stop RSF

Stop the process through the configured process manager or send a graceful termination signal and wait until shutdown completes.

Confirm that no Node.js process is still running RSF before continuing.

### 2. Confirm the configured database path

```powershell
Get-Content .\config\core\database.json -Raw
```

The following commands assume the default path:

```text
data/rogue-soldiers.sqlite3
```

Adjust `$databasePath` when production configuration uses a different filename.

### 3. Create a timestamped backup directory

```powershell
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = 'D:\RogueSoldiersBackups'
$backupDirectory = Join-Path $backupRoot $timestamp
$databasePath = '.\data\rogue-soldiers.sqlite3'

New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
```

Use a backup root that is not inside the Git repository.

### 4. Copy the database

```powershell
Copy-Item -LiteralPath $databasePath -Destination $backupDirectory
```

### 5. Record a checksum

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $backupDirectory 'rogue-soldiers.sqlite3') |
    Format-List |
    Out-File -LiteralPath (Join-Path $backupDirectory 'SHA256.txt') -Encoding utf8
```

### 6. Verify the backup exists

```powershell
Get-ChildItem -LiteralPath $backupDirectory
Get-Content -LiteralPath (Join-Path $backupDirectory 'SHA256.txt')
```

### 7. Restart and smoke-test RSF

Start the framework through the production process manager and confirm:

- Framework startup completes
- Database initialization succeeds
- Discord connects
- Existing commands that read stored data still work

## Restore a Backup

Restoring replaces the active database with the selected backup. Any data written after that backup was created will be lost.

### 1. Stop RSF

Stop the production process and confirm it is no longer running.

Never restore over an open SQLite database.

### 2. Select and verify the backup

```powershell
$backupDirectory = 'D:\RogueSoldiersBackups\YYYYMMDD-HHMMSS'
$backupDatabase = Join-Path $backupDirectory 'rogue-soldiers.sqlite3'

Get-Item -LiteralPath $backupDatabase
Get-FileHash -Algorithm SHA256 -LiteralPath $backupDatabase
Get-Content -LiteralPath (Join-Path $backupDirectory 'SHA256.txt')
```

Compare the calculated SHA-256 value with the stored value before restoring.

### 3. Preserve the current database

```powershell
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$databasePath = '.\data\rogue-soldiers.sqlite3'
$preRestorePath = ".\data\rogue-soldiers.pre-restore-$timestamp.sqlite3"

Copy-Item -LiteralPath $databasePath -Destination $preRestorePath
```

This rollback copy is temporary protection. Move it to protected backup storage after a successful restore or remove it only after the restored system is verified.

### 4. Remove stale SQLite sidecar files

With RSF stopped:

```powershell
Remove-Item -LiteralPath "$databasePath-wal" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$databasePath-shm" -Force -ErrorAction SilentlyContinue
```

### 5. Restore the selected database

```powershell
Copy-Item -LiteralPath $backupDatabase -Destination $databasePath -Force
```

### 6. Start RSF

Start the framework through the production process manager.

At startup, RSF opens the SQLite database, enables foreign keys and WAL mode, applies configured migrations when `autoMigrate` is true, and performs its database health check.

### 7. Verify the restore

Confirm:

- Startup completes without a database error
- Discord connects
- Expected moderation records are present
- Expected economy balances are present
- Expected ticket records are present
- A read-only or low-impact command returns expected historical data

Do not immediately perform destructive moderation, economy, or ticket actions until restored data has been checked.

## Failed Restore Recovery

When startup fails after restore:

1. Stop RSF again.
2. Save the failed restored database for investigation.
3. Remove any generated `-wal` and `-shm` sidecar files while RSF is stopped.
4. Copy the pre-restore database back to the configured database path.
5. Start RSF and verify service recovery.
6. Review the startup error before attempting another restore.

## Backup Retention and Security

- Restrict backup directory access to the service operator and authorized administrators.
- Encrypt backups when stored on removable media, cloud storage, or another host.
- Do not place `.env` secrets inside database backup folders unless the backup system is explicitly designed to protect both.
- Test a restore periodically. A backup is not proven until it can be restored.
- Record backup time, source host, RSF version, database filename, and checksum.

## Current Limitations

RSF does not currently provide:

- Online SQLite backup commands
- Built-in backup scheduling
- Backup encryption
- Backup retention automation
- Remote database replication
- A dedicated database integrity-check CLI

These are operational hosting responsibilities for v1.0.0. The supported procedure is a graceful stop, offline copy, checksum verification, restart, and application-level smoke test.
