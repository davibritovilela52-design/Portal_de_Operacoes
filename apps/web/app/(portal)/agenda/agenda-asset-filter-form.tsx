'use client';

import { useRef } from 'react';

type AgendaAssetOption = {
  id: string;
  label: string;
};

type AgendaAssetFilterFormProps = {
  assets: AgendaAssetOption[];
  monthQuery: string;
  selectedAssetId: string | null;
};

export function AgendaAssetFilterForm({
  assets,
  monthQuery,
  selectedAssetId
}: AgendaAssetFilterFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form ref={formRef} className="agenda-asset-filter" action="/agenda" method="get">
      <input name="month" type="hidden" value={monthQuery} />

      <label className="form-field agenda-asset-filter__label">
        <span>Ativo</span>
        <select
          name="assetId"
          defaultValue={selectedAssetId ?? ''}
          onChange={() => {
            formRef.current?.requestSubmit();
          }}
        >
          <option value="">Todos os ativos</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
