type ParsedDateResult =
  | {
      status: "valid";
      isoDate: string;
      rawDate: string;
    }
  | {
      status: "invalid_date";
      rawDate: string;
    }
  | {
      status: "missing_date";
    };

export type ParsedBlokCommand =
  | {
      status: "valid";
      isoDate: string;
      rawDate: string;
    }
  | {
      status: "invalid_date";
      rawDate: string;
    }
  | null;

export type ParsedJoinBlokCommand =
  | {
      status: "valid";
    }
  | null;

export type ParsedAmbcBlokImport =
  | {
      status: "valid";
      isoDate: string;
      rawDate: string;
      playerNames: string[];
      waitingListNames: string[];
      title: string | null;
      location: string | null;
    }
  | {
      status: "missing_date";
    }
  | {
      status: "invalid_date";
      rawDate: string;
    }
  | {
      status: "no_players";
      isoDate: string;
      rawDate: string;
      waitingListNames: string[];
      title: string | null;
      location: string | null;
    }
  | null;

const BLOK_COMMAND_REGEX = /^\s*#blokambc\s+(\d{2})\.(\d{2})\.(\d{4})\s*$/i;
const JOIN_BLOK_COMMAND_REGEX = /^\s*#join\s*blok\s*$/i;
const AMBC_BLOK_HASHTAG_REGEX = /#(?:ambcblok|blokambc)\b/i;
const DATE_REGEX = /(\d{2})\.(\d{2})\.(\d{4})/;

function parseDate(dayText: string, monthText: string, yearText: string): ParsedDateResult {
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  const rawDate = `${dayText}.${monthText}.${yearText}`;
  const isValidDate =
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day;

  if (!isValidDate) {
    return {
      status: "invalid_date",
      rawDate,
    };
  }

  return {
    status: "valid",
    isoDate: `${yearText}-${monthText}-${dayText}`,
    rawDate,
  };
}

function sanitizeText(value: string): string {
  return value
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[*_`~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetadataLine(messageText: string, matcher: RegExp): string | null {
  const line = messageText
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => matcher.test(item));

  return line ? sanitizeText(line) : null;
}

function extractNumberedNames(sectionText: string): string[] {
  const playerNames: string[] = [];

  for (const line of sectionText.split(/\r?\n/)) {
    const match = line.match(/^\s*\d+\.\s*(.+?)\s*$/);

    if (!match) {
      continue;
    }

    const cleanedName = sanitizeText(match[1]);

    if (cleanedName) {
      playerNames.push(cleanedName);
    }
  }

  return playerNames;
}

function extractPlayerNames(messageText: string): string[] {
  const mainSection = messageText.split(/waiting\s*list/i)[0] || messageText;
  return extractNumberedNames(mainSection);
}

function extractWaitingListNames(messageText: string): string[] {
  const sections = messageText.split(/waiting\s*list/i);

  if (sections.length < 2) {
    return [];
  }

  return extractNumberedNames(sections.slice(1).join("\n"));
}

function findDateInMessage(messageText: string): ParsedDateResult {
  const match = messageText.match(DATE_REGEX);

  if (!match) {
    return {
      status: "missing_date",
    };
  }

  const [, dayText, monthText, yearText] = match;
  return parseDate(dayText, monthText, yearText);
}

export function parseBlokCommand(messageText: string): ParsedBlokCommand {
  const match = messageText.match(BLOK_COMMAND_REGEX);

  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText] = match;
  const parsedDate = parseDate(dayText, monthText, yearText);

  if (parsedDate.status === "missing_date") {
    return null;
  }

  return parsedDate;
}

export function parseJoinBlokCommand(messageText: string): ParsedJoinBlokCommand {
  return JOIN_BLOK_COMMAND_REGEX.test(messageText)
    ? {
        status: "valid",
      }
    : null;
}

export function parseAmbcBlokImport(messageText: string): ParsedAmbcBlokImport {
  if (BLOK_COMMAND_REGEX.test(messageText)) {
    return null;
  }

  if (!AMBC_BLOK_HASHTAG_REGEX.test(messageText)) {
    return null;
  }

  const parsedDate = findDateInMessage(messageText);

  if (parsedDate.status !== "valid") {
    return parsedDate;
  }

  const playerNames = extractPlayerNames(messageText);
  const waitingListNames = extractWaitingListNames(messageText);
  const title =
    extractMetadataLine(messageText, /ambc\s*(block|blok)/i) || `BLOK ${parsedDate.rawDate}`;
  const location = extractMetadataLine(messageText, /📍/);

  if (playerNames.length === 0) {
    return {
      status: "no_players",
      isoDate: parsedDate.isoDate,
      rawDate: parsedDate.rawDate,
      waitingListNames,
      title,
      location,
    };
  }

  return {
    status: "valid",
    isoDate: parsedDate.isoDate,
    rawDate: parsedDate.rawDate,
    playerNames,
    waitingListNames,
    title,
    location,
  };
}