export function dateKeyToDate(dateKey: string): Date | null {
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isSundayDate(date: Date): boolean {
  return date.getDay() === 0;
}

export function isSundayKey(dateKey: string): boolean {
  const date = dateKeyToDate(dateKey);
  return date ? isSundayDate(date) : false;
}

export function isSelectableAgendaDate(date: Date): boolean {
  return !isSundayDate(date);
}

export function agendaDayClassName(date: Date): string {
  return isSundayDate(date) ? "agenda-sunday-blocked" : "";
}
