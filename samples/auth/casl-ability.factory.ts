import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  InferSubjects,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { RequestActor } from '../interfaces/actor-payload.interface';

type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';
type Subjects = 'Reservation' | 'Customer' | 'ServiceProvider' | 'AdminUser' | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForActor(actor: RequestActor): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    switch (actor.actorType) {
      case 'admin':
        can('manage', 'all');
        break;

      case 'customer':
        can('read', 'Reservation', { customerId: actor.id } as any);
        can('create', 'Reservation');
        can('read', 'Customer', { id: actor.id } as any);
        can('update', 'Customer', { id: actor.id } as any);
        break;

      case 'provider':
        can('read', 'Reservation', { providerId: actor.id } as any);
        can('read', 'ServiceProvider', { id: actor.id } as any);
        can('update', 'ServiceProvider', { id: actor.id } as any);
        break;
    }

    return build();
  }
}
