import { RATING_FACET_MIN } from './constants';
import { buildTextSearchClause } from './search-text.util';

export const STORE_SEARCH_TEXT_FIELDS = [
  'storeNameAr^4',
  'searchTextAr^3',
  'searchText^3',
  'storeName^2',
  'searchTextEn^2',
  'providerName',
] as const;

export const SERVICE_SEARCH_TEXT_FIELDS = [
  'nameEn^3',
  'nameAr^3',
  'searchTextEn^2',
  'searchTextAr^2',
  'searchText',
  'slug^2',
] as const;

export type StoreSearchSort =
  | 'distance'
  | 'rating'
  | 'reviews'
  | 'name'
  | 'nameDesc';

export interface StoreSearchQueryParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  search?: string;
  categoryId?: string;
  cityKey?: string;
  providerId?: string;
  minRating?: number;
  sortBy?: StoreSearchSort;
  limit: number;
  offset: number;
}

export function buildStoreSearchBody(params: StoreSearchQueryParams): Record<string, unknown> {
  const baseFilters: Record<string, unknown>[] = [
    { term: { visible: true } },
    { term: { providerActive: true } },
    {
      geo_distance: {
        distance: `${params.radiusMeters}m`,
        location: { lat: params.lat, lon: params.lng },
      },
    },
  ];

  const must: Record<string, unknown>[] = [];
  if (params.search?.trim()) {
    const textClause = buildTextSearchClause(params.search, [...STORE_SEARCH_TEXT_FIELDS]);
    if (textClause) must.push(textClause);
  }

  const postFilters = buildPostFilters(params);
  const sort = buildSort(params);

  return {
    from: params.offset,
    size: params.limit,
    track_total_hits: true,
    query: {
      bool: {
        filter: baseFilters,
        ...(must.length > 0 ? { must } : {}),
      },
    },
    ...(postFilters.length > 0
      ? { post_filter: { bool: { filter: postFilters } } }
      : {}),
    sort,
    aggs: buildFacetAggregations(baseFilters, must, params),
  };
}

function buildPostFilters(
  params: StoreSearchQueryParams,
  exclude?: 'category' | 'city' | 'provider' | 'rating',
): Record<string, unknown>[] {
  const filters: Record<string, unknown>[] = [];
  if (params.categoryId && exclude !== 'category') {
    filters.push({ term: { categoryIds: params.categoryId } });
  }
  if (params.cityKey && exclude !== 'city') {
    filters.push({ term: { cityKey: params.cityKey } });
  }
  if (params.providerId && exclude !== 'provider') {
    filters.push({ term: { providerId: params.providerId } });
  }
  if (params.minRating != null && params.minRating > 0 && exclude !== 'rating') {
    filters.push({ range: { averageRating: { gte: params.minRating } } });
  }
  return filters;
}

function buildSort(params: StoreSearchQueryParams): Array<Record<string, unknown> | string> {
  switch (params.sortBy) {
    case 'rating':
      return [{ averageRating: { order: 'desc' } }, '_score'];
    case 'reviews':
      return [{ reviewCount: { order: 'desc' } }, '_score'];
    case 'name':
      return [{ 'storeName.keyword': { order: 'asc' } }];
    case 'nameDesc':
      return [{ 'storeName.keyword': { order: 'desc' } }];
    case 'distance':
    default:
      return [
        {
          _geo_distance: {
            location: { lat: params.lat, lon: params.lng },
            order: 'asc',
            unit: 'm',
          },
        },
      ];
  }
}

function buildFacetAggregations(
  baseFilters: Record<string, unknown>[],
  must: Record<string, unknown>[],
  params: StoreSearchQueryParams,
): Record<string, unknown> {
  const baseQuery = {
    bool: {
      filter: baseFilters,
      ...(must.length > 0 ? { must } : {}),
    },
  };

  const facetQuery = (exclude: 'category' | 'city' | 'provider' | 'rating') => {
    const extra = buildPostFilters(params, exclude);
    if (extra.length === 0) return baseQuery;
    return {
      bool: {
        filter: [...baseFilters, ...extra],
        ...(must.length > 0 ? { must } : {}),
      },
    };
  };

  const ratingRanges = Object.entries(RATING_FACET_MIN)
    .filter(([key]) => key !== '0')
    .map(([key, from]) => ({ key, from }));

  return {
    categories: {
      filter: facetQuery('category'),
      aggs: { buckets: { terms: { field: 'categoryIds', size: 50 } } },
    },
    cities: {
      filter: facetQuery('city'),
      aggs: {
        buckets: {
          terms: { field: 'cityKey', size: 50 },
          aggs: {
            label: { top_hits: { size: 1, _source: { includes: ['city'] } } },
          },
        },
      },
    },
    providers: {
      filter: facetQuery('provider'),
      aggs: {
        buckets: {
          terms: { field: 'providerId', size: 100 },
          aggs: {
            label: { top_hits: { size: 1, _source: { includes: ['providerName'] } } },
          },
        },
      },
    },
    serviceLocationModes: {
      filter: baseQuery,
      aggs: { buckets: { terms: { field: 'serviceLocationMode', size: 10 } } },
    },
    ratingRanges: {
      filter: facetQuery('rating'),
      aggs: {
        buckets: {
          range: { field: 'averageRating', ranges: ratingRanges },
        },
      },
    },
  };
}
