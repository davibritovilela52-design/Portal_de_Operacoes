import {
  realEstateCategoryLabels,
  realEstateStatusLabels,
  type RealEstateCategory,
  type RealEstateReportRecord,
  type RealEstateStatus
} from '../../../lib/portal-model';

export type RealEstateTicketFilterQuery = {
  status?: RealEstateStatus;
  category?: RealEstateCategory;
  assetId?: string;
};

export function readRealEstateTicketFilterQuery(
  searchParams: Record<string, string | string[] | undefined>
): RealEstateTicketFilterQuery {
  return {
    status:
      typeof searchParams.status === 'string'
        ? (searchParams.status as RealEstateStatus)
        : undefined,
    category:
      typeof searchParams.category === 'string'
        ? (searchParams.category as RealEstateCategory)
        : undefined,
    assetId: typeof searchParams.assetId === 'string' ? searchParams.assetId : undefined
  };
}

export function filterRealEstateReportsByQuery(
  reports: RealEstateReportRecord[],
  query: RealEstateTicketFilterQuery
): RealEstateReportRecord[] {
  return reports.filter((report) => {
    if (query.status && report.status !== query.status) return false;
    if (query.category && report.category !== query.category) return false;
    if (query.assetId && report.assetId !== query.assetId) return false;
    return true;
  });
}

type RealEstateTicketFilterFormProps = {
  action: string;
  query: RealEstateTicketFilterQuery;
};

export function RealEstateTicketFilterForm({ action, query }: RealEstateTicketFilterFormProps) {
  return (
    <form action={action} method="GET" className="filter-form">
      <select name="status" defaultValue={query.status ?? ''}>
        <option value="">Todos os status</option>
        {(Object.keys(realEstateStatusLabels) as RealEstateStatus[]).map((status) => (
          <option key={status} value={status}>
            {realEstateStatusLabels[status]}
          </option>
        ))}
      </select>

      <select name="category" defaultValue={query.category ?? ''}>
        <option value="">Todas as categorias</option>
        {(Object.keys(realEstateCategoryLabels) as RealEstateCategory[]).map((cat) => (
          <option key={cat} value={cat}>
            {realEstateCategoryLabels[cat]}
          </option>
        ))}
      </select>

      <button type="submit" className="action-button action-button--ghost">
        Filtrar
      </button>
    </form>
  );
}
