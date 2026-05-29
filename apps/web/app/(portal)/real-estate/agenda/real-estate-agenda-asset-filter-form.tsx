'use client';

import { useRef } from 'react';

type RealEstateAgendaAssetOption = {
  id: string;
  label: string;
};

type RealEstateAgendaAssetFilterFormProps = {
  assets: RealEstateAgendaAssetOption[];
  monthQuery: string;
  selectedAssetId: string | null;
};

export function RealEstateAgendaAssetFilterForm({
  assets,
  monthQuery,
  selectedAssetId
}: RealEstateAgendaAssetFilterFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form ref={formRef} className="agenda-asset-filter" action="/real-estate/agenda" method="get">
      <input name="month" type="hidden" value={monthQuery} />

      <label className="form-field agenda-asset-filter__label">
        <span>Imóvel</span>
        <select
          name="assetId"
          defaultValue={selectedAssetId ?? ''}
          onChange={() => {
            formRef.current?.requestSubmit();
          }}
        >
          <option value="">Todos os imóveis</option>
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
