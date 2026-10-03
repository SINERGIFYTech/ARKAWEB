export const TRIGGER_TYPES = {
  "distributor.created": {
    label: "Se registra un distribuidor nuevo",
    fields: ["code", "fullName", "rank"],
  },
  "ticket.created": {
    label: "Se crea un ticket de soporte",
    fields: ["subject", "priority"],
  },
  "rank.changed": {
    label: "El rango de un distribuidor cambia",
    fields: ["fullName", "oldRank", "newRank"],
  },
  "period.closed": {
    label: "Se cierra un periodo de comisiones",
    fields: ["periodLabel", "distributorsPaid", "totalPaid"],
  },
} as const;

export type TriggerType = keyof typeof TRIGGER_TYPES;

export const OPERATORS = {
  equals: "es igual a",
  not_equals: "es distinto de",
  greater_than: "es mayor que",
  less_than: "es menor que",
  contains: "contiene",
} as const;

export type Operator = keyof typeof OPERATORS;

export interface AutomationCondition {
  field: string;
  operator: Operator;
  value: string;
}

export const ACTION_TYPES = {
  "notification.create": {
    label: "Crear notificación interna",
    fields: ["title", "body"],
  },
  "webhook.call": {
    label: "Llamar un webhook (POST a una URL)",
    fields: ["url"],
  },
  "email.send": {
    label: "Enviar correo",
    fields: ["to", "subject", "body"],
  },
} as const;

export type ActionType = keyof typeof ACTION_TYPES;

export interface AutomationAction {
  type: ActionType;
  config: Record<string, string>;
}

export interface AutomationRule {
  id: string;
  name: string;
  triggerType: TriggerType;
  isEnabled: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

// Reemplaza {{campo}} por el valor real del payload del evento. Sencillo a propósito:
// no es un motor de templates completo, solo interpolación plana.
export function interpolate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = payload[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function evaluateConditions(conditions: AutomationCondition[], payload: Record<string, unknown>): boolean {
  return conditions.every((c) => {
    const actual = payload[c.field];
    const actualStr = actual === undefined || actual === null ? "" : String(actual);
    const actualNum = Number(actual);
    const valueNum = Number(c.value);

    switch (c.operator) {
      case "equals":
        return actualStr === c.value;
      case "not_equals":
        return actualStr !== c.value;
      case "contains":
        return actualStr.toLowerCase().includes(c.value.toLowerCase());
      case "greater_than":
        return !Number.isNaN(actualNum) && !Number.isNaN(valueNum) && actualNum > valueNum;
      case "less_than":
        return !Number.isNaN(actualNum) && !Number.isNaN(valueNum) && actualNum < valueNum;
      default:
        return true;
    }
  });
}
