/** True when the query contains Latin letters — safe for OpenSearch fuzziness. */
export function shouldUseFuzziness(query: string): boolean {
  return /[\p{Script=Latin}]/u.test(query);
}

export function containsArabicScript(text: string): boolean {
  return /[\p{Script=Arabic}]/u.test(text);
}

export function joinSearchParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');
}

export type LocaleNames = {
  en: string[];
  ar: string[];
  all: string[];
};

/** Partition translation rows into English, Arabic, and combined name lists. */
export function partitionNamesByLocale(
  rows: Array<{ locale_code: string; name: string | null }>,
): LocaleNames {
  const en: string[] = [];
  const ar: string[] = [];
  const all: string[] = [];

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) continue;
    all.push(name);
    if (row.locale_code === 'ar') {
      ar.push(name);
    } else {
      en.push(name);
    }
  }

  return { en, ar, all };
}

function fieldBaseName(field: string): string {
  return field.replace(/\^[0-9.]+$/, '');
}

export function buildTextSearchClause(
  query: string,
  fields: string[],
): Record<string, unknown> | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const latin = shouldUseFuzziness(trimmed);
  const arabic = containsArabicScript(trimmed);
  const should: Record<string, unknown>[] = [];

  const providerFields = fields.filter((f) => fieldBaseName(f) === 'providerName');
  const textFields = fields.filter((f) => fieldBaseName(f) !== 'providerName');

  if (textFields.length > 0) {
    should.push({
      multi_match: {
        query: trimmed,
        fields: textFields,
        type: 'best_fields',
        ...(latin ? { fuzziness: 'AUTO' as const } : {}),
      },
    });
  }

  // Provider email prefixes (e.g. provider2) must not fuzzy-match provider8.
  if (providerFields.length > 0) {
    should.push({
      multi_match: {
        query: trimmed,
        fields: providerFields,
        type: 'best_fields',
      },
    });
  }

  // Arabic script often scores poorly on english_text fields — extra pass on AR + bilingual fields.
  if (arabic && textFields.length > 0) {
    const arFields = textFields.filter((f) => {
      const base = fieldBaseName(f);
      return (
        base === 'searchTextAr' ||
        base === 'searchText' ||
        base === 'storeNameAr' ||
        base === 'nameAr'
      );
    });
    if (arFields.length > 0) {
      should.push({
        multi_match: {
          query: trimmed,
          fields: arFields,
          type: 'best_fields',
        },
      });
    }
  }

  if (should.length === 1) return should[0] as Record<string, unknown>;
  return { bool: { should, minimum_should_match: 1 } };
}
