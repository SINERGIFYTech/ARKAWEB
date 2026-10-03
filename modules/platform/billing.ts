// ==========================================
// Modelo comercial de BackOffice Engine (plataforma) — editable aquí.
// Renta base en MXN, excedente en USD (monedas distintas a propósito,
// tal como se definió el esquema comercial — no se hace conversión automática).
// ==========================================
export const BILLING_CONFIG = {
  baseFeeMXN: 9800,
  includedInteractions: 10000,
  overageBlockSize: 10000,
  overageBlockPriceUSD: 25,
};

export interface TenantBilling {
  totalInteractions: number;
  includedInteractions: number;
  overageInteractions: number;
  overageBlocks: number;
  baseFeeMXN: number;
  overageCostUSD: number;
}

export function computeBilling(totalInteractions: number): TenantBilling {
  const overageInteractions = Math.max(0, totalInteractions - BILLING_CONFIG.includedInteractions);
  const overageBlocks = Math.ceil(overageInteractions / BILLING_CONFIG.overageBlockSize);

  return {
    totalInteractions,
    includedInteractions: BILLING_CONFIG.includedInteractions,
    overageInteractions,
    overageBlocks,
    baseFeeMXN: BILLING_CONFIG.baseFeeMXN,
    overageCostUSD: overageBlocks * BILLING_CONFIG.overageBlockPriceUSD,
  };
}

// Mes calendario actual — simplificación: todos los tenants facturan del día 1 al
// último día del mes, no por aniversario de alta. Ajustar aquí si se necesita otra regla.
export function getCurrentBillingPeriod(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = start.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return { start, end, label };
}
