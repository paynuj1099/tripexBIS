export function getErrorMessage(error: unknown, fallback: string) {
  return typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : fallback;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatTime(value?: string) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)));
}

export function formatStayDate(date: string, time?: string) {
  const formattedTime = formatTime(time);
  return formattedTime
    ? `${formatDate(date)} at ${formattedTime}`
    : formatDate(date);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

type NightlyRateLine = { nightDate: string; nightlyRate: number };

export type NightlyRateRange = {
  startDate: string;
  endDate: string;
  nightlyRate: number;
  nightCount: number;
};

export function groupConsecutiveNightlyRates(
  lines: readonly NightlyRateLine[],
): NightlyRateRange[] {
  const sortedLines = [...lines].sort((left, right) =>
    left.nightDate.localeCompare(right.nightDate),
  );

  return sortedLines.reduce<NightlyRateRange[]>((ranges, line) => {
    const previousRange = ranges.at(-1);
    const expectedNextDate = previousRange
      ? addDays(previousRange.endDate, 1)
      : null;

    if (
      previousRange &&
      previousRange.nightlyRate === line.nightlyRate &&
      expectedNextDate === line.nightDate
    ) {
      previousRange.endDate = line.nightDate;
      previousRange.nightCount += 1;
    } else {
      ranges.push({
        startDate: line.nightDate,
        endDate: line.nightDate,
        nightlyRate: line.nightlyRate,
        nightCount: 1,
      });
    }

    return ranges;
  }, []);
}

export function formatNightlyRateRange(startValue: string, endValue: string) {
  if (startValue === endValue) return formatDate(startValue);

  const start = new Date(`${startValue}T00:00:00Z`);
  const end = new Date(`${endValue}T00:00:00Z`);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    const month = new Intl.DateTimeFormat(undefined, {
      month: "short",
      timeZone: "UTC",
    }).format(start);
    return `${month} ${start.getUTCDate()} – ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }

  const startFormat = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  });
  const endFormat = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${startFormat.format(start)} – ${endFormat.format(end)}`;
}

export function calculateNights(checkIn: string, checkOut: string) {
  return Math.round(
    (new Date(`${checkOut}T00:00:00Z`).getTime() -
      new Date(`${checkIn}T00:00:00Z`).getTime()) /
      86_400_000,
  );
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}
