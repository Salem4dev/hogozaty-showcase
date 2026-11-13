import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import DataLoader from 'dataloader';
import { Category } from 'src/catalog/entities/category.entity';
import { Service } from 'src/catalog/entities/service.entity';
import { ProviderServiceOffer } from 'src/catalog/entities/provider-service-offer.entity';
import { Store } from 'src/booking/entities/store.entity';
import { ServiceProvider } from 'src/providers/entities/service-provider.entity';

/**
 * REQUEST-scoped so each GraphQL request gets its own batched DataLoaders.
 * Register in GraphQL context factory so resolvers can access via `@Context()`.
 */
@Injectable({ scope: Scope.REQUEST })
export class DomainLoadersService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(ProviderServiceOffer)
    private readonly offerRepo: Repository<ProviderServiceOffer>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(ServiceProvider)
    private readonly providerRepo: Repository<ServiceProvider>,
  ) {}

  // ── Category by ID ────────────────────────────────────────────────────────

  readonly categoryById = new DataLoader<string, Category | null>(async (ids: readonly string[]) => {
    const categories = await this.categoryRepo.findBy({ id: In([...ids]) });
    const map = new Map(categories.map((c) => [c.id, c]));
    return ids.map((id) => map.get(id) ?? null);
  });

  // ── Service by ID ─────────────────────────────────────────────────────────

  readonly serviceById = new DataLoader<string, Service | null>(async (ids: readonly string[]) => {
    const services = await this.serviceRepo.findBy({ id: In([...ids]) });
    const map = new Map(services.map((s) => [s.id, s]));
    return ids.map((id) => map.get(id) ?? null);
  });

  // ── Offers by provider ID (batch load all provider offers in one query) ───

  readonly offersByProviderId = new DataLoader<string, ProviderServiceOffer[]>(
    async (providerIds: readonly string[]) => {
      const offers = await this.offerRepo.findBy({ providerId: In([...providerIds]) });
      const map = new Map<string, ProviderServiceOffer[]>();
      for (const offer of offers) {
        if (!map.has(offer.providerId)) map.set(offer.providerId, []);
        map.get(offer.providerId).push(offer);
      }
      return providerIds.map((id) => map.get(id) ?? []);
    },
  );

  // ── Stores by provider ID ─────────────────────────────────────────────────

  readonly storesByProviderId = new DataLoader<string, Store[]>(
    async (providerIds: readonly string[]) => {
      const stores = await this.storeRepo.findBy({ providerId: In([...providerIds]) });
      const map = new Map<string, Store[]>();
      for (const store of stores) {
        if (!map.has(store.providerId)) map.set(store.providerId, []);
        map.get(store.providerId).push(store);
      }
      return providerIds.map((id) => map.get(id) ?? []);
    },
  );

  // ── Provider by ID ────────────────────────────────────────────────────────

  readonly providerById = new DataLoader<string, ServiceProvider | null>(
    async (ids: readonly string[]) => {
      const providers = await this.providerRepo.findBy({ id: In([...ids]) });
      const map = new Map(providers.map((p) => [p.id, p]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );
}
