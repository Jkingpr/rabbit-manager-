const PUERTO_RICO_TIMEZONE = 'America/Puerto_Rico';

export function getTodayDateString(): string {
  const prDate = new Date().toLocaleString('en-US', { 
    timeZone: PUERTO_RICO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const [month, day, year] = prDate.split(',')[0].split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function parseDateInLocalTimezone(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateForDisplay(dateString: string): string {
  const date = parseDateInLocalTimezone(dateString);
  return date.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateAge(birthDateString: string): { years: number; months: number; days: number; totalDays: number } {
  const birthDate = parseDateInLocalTimezone(birthDateString);
  const today = new Date();
  
  const totalDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const remainingDaysAfterYears = totalDays % 365;
  const months = Math.floor(remainingDaysAfterYears / 30);
  const days = remainingDaysAfterYears % 30;
  
  return { years, months, days, totalDays };
}

export function formatAge(birthDateString: string): string {
  const { years, months } = calculateAge(birthDateString);
  return years < 1 ? `${months} meses` : `${years} ${years === 1 ? 'año' : 'años'}`;
}

export function formatDetailedAge(birthDateString: string): string {
  const { years, months, days } = calculateAge(birthDateString);
  
  const parts = [];
  if (years > 0) parts.push(`${years}a`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 || parts.length === 0) parts.push(`${days}d`);
  
  return parts.join(' ');
}

export function addDaysToDate(dateString: string, days: number): string {
  const date = parseDateInLocalTimezone(dateString);
  date.setDate(date.getDate() + days);
  return formatDateForInput(date);
}

export function formatFutureDate(dateString: string, days: number): string {
  const futureDate = addDaysToDate(dateString, days);
  return formatDateForDisplay(futureDate);
}
