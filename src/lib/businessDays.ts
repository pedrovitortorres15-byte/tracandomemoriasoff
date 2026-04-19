// Feriados nacionais fixos brasileiros (sem cálculos de Páscoa por simplicidade)
// A dona pode ajustar manualmente datas lotadas, então essa lista é só baseline.
const FIXED_HOLIDAYS_MMDD = new Set<string>([
  "01-01", // Confraternização Universal
  "04-21", // Tiradentes
  "05-01", // Dia do Trabalho
  "09-07", // Independência
  "10-12", // Nossa Senhora Aparecida
  "11-02", // Finados
  "11-15", // Proclamação da República
  "12-25", // Natal
]);

export function isBusinessDay(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return false; // domingo/sábado
  const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return !FIXED_HOLIDAYS_MMDD.has(mmdd);
}

/** Adiciona N dias úteis a partir de hoje (excluindo o próprio dia). */
export function addBusinessDays(start: Date, businessDaysToAdd: number): Date {
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < businessDaysToAdd) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) added++;
  }
  return d;
}

export function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
