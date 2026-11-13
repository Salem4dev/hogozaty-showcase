export const DISCOVERABLE_STORES_INDEX = 'discoverable-stores';
export const DISCOVERABLE_SERVICES_INDEX = 'discoverable-services';

export const RATING_FACET_KEYS = ['0', '3', '4', '4.5'] as const;
export type RatingFacetKey = (typeof RATING_FACET_KEYS)[number];

export const RATING_FACET_MIN: Record<RatingFacetKey, number> = {
  '0': 0,
  '3': 3,
  '4': 4,
  '4.5': 4.5,
};
