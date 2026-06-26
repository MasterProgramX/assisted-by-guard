export interface CommitTrailer {
  key: string;
  normalizedKey: string;
  value: string;
  line: number;
}

const trailerPattern = /^([A-Za-z][A-Za-z0-9-]*):\s*(.+)$/;

export function normalizeTrailerKey(key: string): string {
  return key.trim().toLowerCase();
}

export function parseCommitTrailers(message: string): CommitTrailer[] {
  const lines = message.replace(/\r\n/g, "\n").split("\n");
  let end = lines.length - 1;

  while (end >= 0 && lines[end]?.trim() === "") {
    end -= 1;
  }

  const trailers: CommitTrailer[] = [];
  let pendingContinuation: string[] = [];

  for (let index = end; index >= 0; index -= 1) {
    const line = lines[index] ?? "";

    if (/^\s+\S/.test(line) && trailers.length === 0) {
      pendingContinuation.unshift(line.trim());
      continue;
    }

    const match = trailerPattern.exec(line);

    if (!match) {
      break;
    }

    const [, key = "", rawValue = ""] = match;
    const valueParts = [rawValue.trim(), ...pendingContinuation];
    trailers.unshift({
      key,
      normalizedKey: normalizeTrailerKey(key),
      value: valueParts.join(" "),
      line: index + 1
    });
    pendingContinuation = [];
  }

  return trailers;
}

export function findTrailers(message: string, keys: string[]): CommitTrailer[] {
  const accepted = new Set(keys.map(normalizeTrailerKey));
  return parseCommitTrailers(message).filter((trailer) => accepted.has(trailer.normalizedKey));
}
