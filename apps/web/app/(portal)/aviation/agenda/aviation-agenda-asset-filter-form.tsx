'use client';

import { useRef } from 'react';

type AviationAgendaAssetOption = {
  id: string;
  label: string;
};

type AviationAgendaAssetFilterFormProps = {
  assets: AviationAgendaAssetOption[];
  monthQuery: string;
  selectedAssetId: string | null;
};

export function AviationAgendaAssetFilterForm({
  assets,
  monthQuery,
  selectedAssetId
}: AviationAgendaAssetFilterFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form ref={formRef} className="agenda-asset-filter" action="/aviation/agenda" method="get">
      <input name="month" type="hidden" value={monthQuery} />

      <label className="form-field agenda-asset-filter__label">
        <span>Aeronave</span>
        <select
          name="assetId"
          defaultValue={selectedAssetId ?? ''}
          onChange={() => {
            formRef.current?.requestSubmit();
          }}
        >
          <option value="">Todas as aeronaves</option>
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
