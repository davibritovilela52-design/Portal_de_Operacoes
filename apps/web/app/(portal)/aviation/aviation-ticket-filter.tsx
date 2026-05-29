import Link from 'next/link';

import {
  type AviationReportRecord
} from '../../../lib/portal-model';

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type FilterableAviationReport = Pick<AviationReportRecord, 'id' | 'reportNumber' | 'title'>;

export type AviationTicketFilterBasePath = '/aviation/reports';

export function readAviationTicketFilterQuery(
  searchParams: SearchParamsRecord
) {
  const value = searchParams.query;

  return typeof value === 'string' ? value.trim() : '';
}

export function filterAviationReportsByQuery<T extends FilterableAviationReport>(
  reports: T[],
  query: string
) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return reports;
  }

  const normalizedQuery = normalizeSearchValue(trimmedQuery);
  const compactQuery = compactSearchValue(trimmedQuery);

  return reports.filter((report) =>
    [report.id, report.reportNumber, report.title].some((value) =>
      matchesSearchQuery(value, normalizedQuery, compactQuery)
    )
  );
}

type AviationTicketFilterFormProps = {
  action: AviationTicketFilterBasePath;
  query: string;
};

export function AviationTicketFilterForm({ action, query }: AviationTicketFilterFormProps) {
  return (
    <form action={action} method="get" className="maintenance-ticket-filter">
      <label className="form-field maintenance-ticket-filter__field">
        <span>Filtrar reportes</span>
        <input
          aria-label="Buscar por ID ou titulo do reporte"
          defaultValue={query}
          name="query"
          placeholder="Buscar por ID ou titulo do reporte"
          type="search"
        />
      </label>

      <div className="maintenance-ticket-filter__actions">
        <button className="action-button action-button--ghost" type="submit">
          Filtrar
        </button>

        {query ? (
          <Link
            className="action-button action-button--ghost"
            href={buildAviationTicketPath(action)}
          >
            Limpar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export function buildAviationTicketPath(
  basePath: AviationTicketFilterBasePath,
  query?: string,
  extraQueryParams?: Record<string, string | undefined | null>
) {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set('query', query.trim());
  }

  for (const [key, value] of Object.entries(extraQueryParams ?? {})) {
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function matchesSearchQuery(value: string, normalizedQuery: string, compactQuery: string) {
  const normalizedValue = normalizeSearchValue(value);

  if (normalizedValue.includes(normalizedQuery)) {
    return true;
  }

  if (!compactQuery) {
    return false;
  }

  return compactSearchValue(value).includes(compactQuery);
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function compactSearchValue(value: string) {
  return normalizeSearchValue(value).replace(/[^a-z0-9]/g, '');
}
