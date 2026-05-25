import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { PrismaService } from '../src/modules/persistence/prisma.service.js';
import { PrismaLegacyYachtsImportRepository } from '../src/modules/cutover/legacy-yachts-import.repository.js';
import { LegacyYachtsImportService } from '../src/modules/cutover/legacy-yachts-import.service.js';

type CliOptions = {
  apply: boolean;
  tenantId: string;
  maintenanceWorkbookPath: string;
  agendaWorkbookPath: string;
  reportOutputPath: string;
  referenceNow: Date;
  assetAliases: Record<string, string>;
};

const defaultRoot = resolve(process.cwd(), '..', '..');
const defaultOptions: CliOptions = {
  apply: false,
  tenantId: 'prime-you',
  maintenanceWorkbookPath: resolve(defaultRoot, 'tb_portal_antigo', 'SolicitacaoManutencao.xlsx'),
  agendaWorkbookPath: resolve(defaultRoot, 'tb_portal_antigo', 'Evento.xlsx'),
  reportOutputPath: resolve(defaultRoot, '.tmp', 'legacy-yachts-import-report.json'),
  referenceNow: new Date(),
  assetAliases: {
    Solar: 'Solar I'
  }
};

async function main() {
  const options = parseCliArguments(process.argv.slice(2));
  const service = new LegacyYachtsImportService();
  const report = await service.buildDryRunReport({
    maintenanceWorkbookPath: options.maintenanceWorkbookPath,
    agendaWorkbookPath: options.agendaWorkbookPath,
    assetAliases: options.assetAliases,
    referenceNow: options.referenceNow
  });

  await mkdir(dirname(options.reportOutputPath), {
    recursive: true
  });
  await writeFile(options.reportOutputPath, JSON.stringify(serializeReport(report), null, 2), 'utf8');

  if (!options.apply) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          tenantId: options.tenantId,
          reportOutputPath: options.reportOutputPath,
          source: report.source,
          assetsDiscovered: report.assets.discovered.length,
          aliasesUsed: report.assets.aliasesUsed,
          maintenanceUnmappedValues: report.maintenance.unmappedValues,
          agendaUnmappedValues: report.agenda.unmappedValues,
          validation: report.validation
        },
        null,
        2
      )
    );

    return;
  }

  const prisma = new PrismaService();

  try {
    const persistence = await service.executeImport({
      tenantId: options.tenantId,
      report,
      repository: new PrismaLegacyYachtsImportRepository(prisma)
    });

    console.log(
      JSON.stringify(
        {
          mode: 'apply',
          tenantId: options.tenantId,
          reportOutputPath: options.reportOutputPath,
          source: report.source,
          persistence
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

function parseCliArguments(argv: string[]): CliOptions {
  const options: CliOptions = {
    ...defaultOptions,
    assetAliases: { ...defaultOptions.assetAliases }
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
      case '--maintenance':
        options.maintenanceWorkbookPath = resolve(readOptionValue(argv, ++index, '--maintenance'));
        break;
      case '--agenda':
        options.agendaWorkbookPath = resolve(readOptionValue(argv, ++index, '--agenda'));
        break;
      case '--report-out':
        options.reportOutputPath = resolve(readOptionValue(argv, ++index, '--report-out'));
        break;
      case '--reference-now':
        options.referenceNow = new Date(readOptionValue(argv, ++index, '--reference-now'));
        break;
      case '--alias': {
        const rawPair = readOptionValue(argv, ++index, '--alias');
        const [from, to] = rawPair.split('=');

        if (!from || !to) {
          throw new Error(`Invalid alias pair: ${rawPair}`);
        }

        options.assetAliases[from] = to;
        break;
      }
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

function serializeReport(report: Awaited<ReturnType<LegacyYachtsImportService['buildDryRunReport']>>) {
  return {
    ...report,
    maintenance: {
      ...report.maintenance,
      normalizedTickets: report.maintenance.normalizedTickets.map((ticket) => ({
        ...ticket,
        openedAt: ticket.openedAt.toISOString()
      }))
    },
    agenda: {
      ...report.agenda,
      normalizedEvents: report.agenda.normalizedEvents.map((event) => ({
        ...event,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString()
      }))
    }
  };
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
