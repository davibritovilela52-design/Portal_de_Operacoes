import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { Client } from 'pg';
import {
  assetAliases,
  legacyEmailsToRevoke,
  requestedRoster,
  type AccessRosterEntry,
  type PortalRole
} from './access-roster-data';

type CliOptions = {
  apply: boolean;
  tenantId: string;
  reportOutputPath: string;
};

type ResolvedRosterEntry = AccessRosterEntry & {
  assetIds: string[];
};

const defaultRoot = resolve(process.cwd(), '..', '..');

const defaultOptions: CliOptions = {
  apply: false,
  tenantId: 'prime-you',
  reportOutputPath: resolve(defaultRoot, '.tmp', 'access-roster-provision-report.json')
};

async function main() {
  const options = parseCliArguments(process.argv.slice(2));
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();

  try {
    const assets = await loadAssets(client, options.tenantId);
    const missingAssets = collectMissingAssets(assets);

    if (missingAssets.length > 0) {
      throw new Error(`Missing asset mappings for: ${missingAssets.join(', ')}`);
    }

    const resolvedEntries = requestedRoster.map((entry) => ({
      ...entry,
      assetIds: entry.assetNames.map((assetName) => assets.get(normalizeAssetName(assetName)) as string)
    })) satisfies ResolvedRosterEntry[];

    const report = await buildReport(client, options.tenantId, resolvedEntries);

    await mkdir(dirname(options.reportOutputPath), {
      recursive: true
    });
    await writeFile(options.reportOutputPath, JSON.stringify(report, null, 2), 'utf8');

    if (!options.apply) {
      console.log(
        JSON.stringify(
          {
            mode: 'dry-run',
            tenantId: options.tenantId,
            reportOutputPath: options.reportOutputPath,
            targetAssignments: resolvedEntries.length,
            targetByRole: summarizeByRole(resolvedEntries),
            legacyEmailsToRevoke
          },
          null,
          2
        )
      );
      return;
    }

    const now = new Date().toISOString();
    const conflictingAssignments = await loadConflictingAssignments(
      client,
      options.tenantId,
      resolvedEntries
    );

    await client.query('begin');

    const revokedLegacyAssignments = await client.query(
      `
        update "AccessAssignment"
        set "revokedAt" = $3
        where "tenantId" = $1
          and email = any($2::text[])
          and "revokedAt" is null
      `,
      [options.tenantId, legacyEmailsToRevoke, now]
    );

    let revokedConflictingAssignments = 0;

    for (const assignment of conflictingAssignments) {
      const revoked = await client.query(
        `
          update "AccessAssignment"
          set "revokedAt" = $4
          where "tenantId" = $1
            and email = $2
            and role = $3
            and "revokedAt" is null
        `,
        [options.tenantId, assignment.email, assignment.role, now]
      );

      revokedConflictingAssignments += revoked.rowCount ?? 0;
    }

    for (const entry of resolvedEntries) {
      await client.query(
        `
          insert into "AccessAssignment" (
            id,
            "tenantId",
            "userId",
            "displayName",
            email,
            role,
            "assetIds",
            "mfaEnabled",
            "lastReviewedAt",
            "revokedAt",
            "createdAt",
            "updatedAt"
          )
          values ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, null, $10, $10)
          on conflict ("tenantId", "userId", role)
          do update
          set
            "displayName" = excluded."displayName",
            email = excluded.email,
            "assetIds" = excluded."assetIds",
            "mfaEnabled" = excluded."mfaEnabled",
            "lastReviewedAt" = excluded."lastReviewedAt",
            "updatedAt" = excluded."updatedAt",
            "revokedAt" = null
        `,
        [
          randomUUID(),
          options.tenantId,
          entry.userId,
          entry.displayName,
          entry.email,
          entry.role,
          entry.assetIds,
          entry.mfaEnabled,
          now,
          now
        ]
      );
    }

    await client.query('commit');

    const finalReport = await buildReport(client, options.tenantId, resolvedEntries);

    await writeFile(options.reportOutputPath, JSON.stringify(finalReport, null, 2), 'utf8');

    console.log(
      JSON.stringify(
        {
          mode: 'apply',
          tenantId: options.tenantId,
          reportOutputPath: options.reportOutputPath,
          upsertsApplied: resolvedEntries.length,
          revokedAssignments:
            (revokedLegacyAssignments.rowCount ?? 0) + revokedConflictingAssignments,
          activeAssignmentsByRole: finalReport.activeAssignmentsByRole
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

function parseCliArguments(argv: string[]): CliOptions {
  const options: CliOptions = {
    ...defaultOptions
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case '--apply':
        options.apply = true;
        break;
      case '--tenant':
        options.tenantId = readOptionValue(argv, ++index, '--tenant');
        break;
      case '--report-out':
        options.reportOutputPath = resolve(readOptionValue(argv, ++index, '--report-out'));
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function readOptionValue(argv: string[], index: number, optionName: string): string {
  const value = argv[index];

  if (!value) {
    throw new Error(`Missing value for ${optionName}`);
  }

  return value;
}

async function loadAssets(client: Client, tenantId: string): Promise<Map<string, string>> {
  const result = await client.query<{
    assetId: string;
    displayName: string;
  }>(
    `
      select "assetId", "displayName"
      from "AssetRegistryItem"
      where "tenantId" = $1
        and active = true
    `,
    [tenantId]
  );

  return new Map(
    result.rows.map((row) => [normalizeAssetName(row.displayName), row.assetId])
  );
}

function collectMissingAssets(assetMap: Map<string, string>): string[] {
  return requestedRoster
    .flatMap((entry) => entry.assetNames)
    .map((assetName) => normalizeAssetName(assetName))
    .filter((assetName, index, all) => all.indexOf(assetName) === index)
    .filter((assetName) => !assetMap.has(assetName));
}

function normalizeAssetName(value: string): string {
  const canonicalValue = assetAliases[value.trim().toLowerCase()] ?? value.trim();
  return canonicalValue.toLowerCase();
}

function summarizeByRole(entries: Array<{ role: PortalRole }>): Record<PortalRole, number> {
  return entries.reduce(
    (summary, entry) => {
      summary[entry.role] += 1;
      return summary;
    },
    {
      portal_admin: 0,
      central_operations: 0,
      yachts_operations: 0,
      real_estate_operations: 0,
      real_estate_technical_coordination: 0,
      asset_field_team: 0
    } satisfies Record<PortalRole, number>
  );
}

async function buildReport(
  client: Client,
  tenantId: string,
  entries: ResolvedRosterEntry[]
) {
  const activeAssignments = await client.query<{
    email: string;
    role: string;
    assetIds: string[];
    }>( 
    `
      select email, role, "assetIds"
      from "AccessAssignment"
      where "tenantId" = $1
        and "revokedAt" is null
      order by email asc
    `,
    [tenantId]
  );

  const targetRoleByEmail = new Map(entries.map((entry) => [entry.email, entry.role]));
  const conflictingActiveAssignments = activeAssignments.rows.filter((row) => {
    const targetRole = targetRoleByEmail.get(row.email);
    return targetRole !== undefined && row.role !== targetRole;
  });

  return {
    tenantId,
    requestedAt: new Date().toISOString(),
    targetAssignments: entries,
    activeAssignmentsByRole: activeAssignments.rows.reduce<Record<string, number>>((summary, row) => {
      summary[row.role] = (summary[row.role] ?? 0) + 1;
      return summary;
    }, {}),
    targetEmails: entries.map((entry) => entry.email),
    activeEmails: activeAssignments.rows.map((row) => row.email),
    conflictingActiveAssignments
  };
}

async function loadConflictingAssignments(
  client: Client,
  tenantId: string,
  entries: ResolvedRosterEntry[]
) {
  const activeAssignments = await client.query<{
    email: string;
    role: string;
  }>(
    `
      select email, role
      from "AccessAssignment"
      where "tenantId" = $1
        and "revokedAt" is null
        and email = any($2::text[])
      order by email asc, role asc
    `,
    [tenantId, entries.map((entry) => entry.email)]
  );

  const targetRoleByEmail = new Map(entries.map((entry) => [entry.email, entry.role]));

  return activeAssignments.rows.filter((row) => {
    const targetRole = targetRoleByEmail.get(row.email);
    return targetRole !== undefined && row.role !== targetRole;
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
