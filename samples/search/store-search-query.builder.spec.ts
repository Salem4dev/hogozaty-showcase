import { buildStoreSearchBody, STORE_SEARCH_TEXT_FIELDS } from './store-search-query.builder';

type MultiMatch = { fields: string[]; fuzziness?: string };
type TextClause = { bool: { should: Array<{ multi_match: MultiMatch }> } };

describe('buildStoreSearchBody', () => {
  const baseParams = {
    lat: 30.04,
    lng: 31.24,
    radiusMeters: 10000,
    limit: 20,
    offset: 0,
  };

  const textFields = STORE_SEARCH_TEXT_FIELDS.filter((f) => f !== 'providerName');

  const textClauses = (search: string) => {
    const body = buildStoreSearchBody({ ...baseParams, search });
    const must = (body.query as { bool: { must: TextClause[] } }).bool.must;
    expect(must).toHaveLength(1);
    return must[0].bool.should.map((clause) => clause.multi_match);
  };

  it('searches all bilingual text fields without locale filtering', () => {
    const [text, provider] = textClauses('حلاقة');

    expect(text.fields).toEqual(textFields);
    expect(provider.fields).toEqual(['providerName']);
  });

  it('uses fuzziness for Latin search terms', () => {
    const [text] = textClauses('salon');

    expect(text.fuzziness).toBe('AUTO');
  });

  it('never applies fuzziness to provider names', () => {
    const [, provider] = textClauses('provider2');

    expect(provider.fields).toEqual(['providerName']);
    expect(provider.fuzziness).toBeUndefined();
  });
});
