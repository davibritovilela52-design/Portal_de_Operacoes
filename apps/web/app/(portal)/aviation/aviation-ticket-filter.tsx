import {
  aviationCategoryLabels,
  aviationStatusLabels,
  type AviationCategory,
  type AviationReportRecord,
  type AviationStatus
} from '../../../lib/portal-model';

export type AviationTicketFilterQuery = {
  status?: AviationStatus;
  category?: AviationCategory;
  assetId?: string;
};

export function readAviationTicketFilterQuery(
  searchParams: Record<string, string | string[] | undefined>
): AviationTicketFilterQuery {
  return {
    status:
      typeof searchParams.status === 'string'
        ? (searchParams.status as AviationStatus)
        : undefined,
    category:
      typeof searchParams.category === 'string'
        ? (searchParams.category as AviationCategory)
        : undefined,
    assetId: typeof searchParams.assetId === 'string' ? searchParams.assetId : undefined
  };
}

export function filterAviationReportsByQuery(
  reports: AviationReportRecord[],
  query: AviationTicketFilterQuery
): AviationReportRecord[] {
  return reports.filter((report) => {
    if (query.status && report.status !== query.status) return false;
    if (query.category && report.category !== query.category) return false;
    if (query.assetId && report.assetId !== query.assetId) return false;
    return true;
  });
}

type AviationTicketFilterFormProps = {
  action: string;
  query: AviationTicketFilterQuery;
};

export function AviationTicketFilterForm({ action, query }: AviationTicketFilterFormProps) {
  return (
    <form action={action} method="GET" className="filter-form">
      <select name="status" defaultValue={query.status ?? ''}>
        <option value="">Todos os status</option>
        {(Object.keys(aviationStatusLabels) as AviationStatus[]).map((status) => (
          <option key={status} value={status}>
            {aviationStatusLabels[status]}
          </option>
        ))}
      </select>

      <select name="category" defaultValue={query.category ?? ''}>
        <option value="">Todas as categorias</option>
        {(Object.keys(aviationCategoryLabels) as AviationCategory[]).map((cat) => (
          <option key={cat} value={cat}>
            {aviationCategoryLabels[cat]}
          </option>
        ))}
      </select>

      <button type="submit" className="action-button action-button--ghost">
        Filtrar
      </button>
    </form>
  );
}
