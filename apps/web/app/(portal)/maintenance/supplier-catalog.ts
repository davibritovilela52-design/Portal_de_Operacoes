export type SupplierRecord = {
  supplierId: string;
  supplierName: string;
  supplierCnpj: string;
  supplierAddress: string;
};

const defaultSupplierCatalog: SupplierRecord[] = [
  {
    supplierId: 'supplier-alfa-marine',
    supplierName: 'Alfa Marine Services',
    supplierCnpj: '12.345.678/0001-90',
    supplierAddress: 'Rua das Docas, 100'
  },
  {
    supplierId: 'supplier-nova-marina',
    supplierName: 'Nova Marina Parts',
    supplierCnpj: '45.678.901/0001-23',
    supplierAddress: 'Av. Beira-Mar, 2400'
  }
];

export function getDefaultSupplierCatalog() {
  return defaultSupplierCatalog.map((supplier) => ({ ...supplier }));
}

export function serializeSupplierCatalog(suppliers: SupplierRecord[]) {
  return JSON.stringify(suppliers.map(normalizeSupplierRecord).filter(isCompleteSupplierRecord));
}

export function parseSupplierCatalog(value: string | null | undefined) {
  if (!value) {
    return getDefaultSupplierCatalog();
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return getDefaultSupplierCatalog();
    }

    const suppliers = parsed
      .map((entry) => normalizeSupplierRecord(entry))
      .filter(isCompleteSupplierRecord);

    return suppliers.length > 0 ? dedupeSuppliers(suppliers) : getDefaultSupplierCatalog();
  } catch {
    return getDefaultSupplierCatalog();
  }
}

export function mergeSupplierCatalog(
  baseSuppliers: SupplierRecord[],
  supplier?: SupplierRecord | null
) {
  const suppliers = dedupeSuppliers(baseSuppliers.map((item) => normalizeSupplierRecord(item)));

  if (!supplier) {
    return suppliers;
  }

  const normalizedSupplier = normalizeSupplierRecord(supplier);

  if (!isCompleteSupplierRecord(normalizedSupplier)) {
    return suppliers;
  }

  if (suppliers.some((item) => item.supplierId === normalizedSupplier.supplierId)) {
    return suppliers;
  }

  return [...suppliers, normalizedSupplier];
}

function normalizeSupplierRecord(value: unknown): SupplierRecord {
  const candidate = value as Partial<SupplierRecord> | null | undefined;

  return {
    supplierId: typeof candidate?.supplierId === 'string' ? candidate.supplierId.trim() : '',
    supplierName: typeof candidate?.supplierName === 'string' ? candidate.supplierName.trim() : '',
    supplierCnpj: typeof candidate?.supplierCnpj === 'string' ? candidate.supplierCnpj.trim() : '',
    supplierAddress:
      typeof candidate?.supplierAddress === 'string' ? candidate.supplierAddress.trim() : ''
  };
}

function isCompleteSupplierRecord(supplier: SupplierRecord) {
  return (
    supplier.supplierId.length > 0 &&
    supplier.supplierName.length > 0 &&
    supplier.supplierCnpj.length > 0 &&
    supplier.supplierAddress.length > 0
  );
}

function dedupeSuppliers(suppliers: SupplierRecord[]) {
  const seen = new Set<string>();

  return suppliers.filter((supplier) => {
    if (seen.has(supplier.supplierId)) {
      return false;
    }

    seen.add(supplier.supplierId);
    return isCompleteSupplierRecord(supplier);
  });
}
