const DEVDOC_REGEX = /(#+) Dev[- ]?Docs?\s+([\S\s]*)/i;

export function extractContent(body) {
  const match = DEVDOC_REGEX.exec(body);
  if (!match) {
    return null;
  }

  const [,headerLevel, text] = match;

  // Remove all text from the next header at the same or a higher level than the Dev-Docs header was
  return text.replace(new RegExp(`^#{1,${headerLevel.length}} [\\s\\S]*`, 'img'), '').trim();
}