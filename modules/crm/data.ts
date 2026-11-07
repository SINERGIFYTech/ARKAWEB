export interface Lead {
  id: string;
  name: string;
  company: string;
  stage: "Nuevo" | "Contactado" | "Propuesta" | "Ganado" | "Perdido";
  value: number;
  owner: string;
  lastContact: string;
}

export const leads: Lead[] = [
  { id: "1", name: "María Torres", company: "Grupo Alfa", stage: "Propuesta", value: 45000, owner: "Ana", lastContact: "Hace 2 días" },
  { id: "2", name: "Carlos Ruiz", company: "Nova Textiles", stage: "Nuevo", value: 12000, owner: "Luis", lastContact: "Hoy" },
  { id: "3", name: "Fernanda López", company: "Bright Clinics", stage: "Contactado", value: 78000, owner: "Ana", lastContact: "Hace 5 días" },
  { id: "4", name: "Jorge Medina", company: "Constructora Sur", stage: "Ganado", value: 152000, owner: "Diego", lastContact: "Hace 1 semana" },
  { id: "5", name: "Sofía Gil", company: "EcoFoods MX", stage: "Perdido", value: 9000, owner: "Luis", lastContact: "Hace 3 semanas" },
  { id: "6", name: "Ricardo Peña", company: "Vertex Agency", stage: "Propuesta", value: 33000, owner: "Diego", lastContact: "Ayer" },
];

export const stageColor: Record<Lead["stage"], string> = {
  Nuevo: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Contactado: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Propuesta: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Ganado: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Perdido: "bg-red-500/10 text-red-600 dark:text-red-400",
};
