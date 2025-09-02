import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update the mapping/properties for a customer's external identity record.
 *
 * This endpoint enables update of properties for a linked external identity,
 * such as last verification time, provider key, or correction of external
 * account linkage problems. Operation is restricted to the customer who owns
 * the external identity or platform administrators. The path ensures both
 * customerId and externalIdentityId match. Attempts to update identities not
 * owned by the customer are forbidden and trigger audit logging.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user
 * @param props.customerId - UUID of the customer who owns the external identity
 * @param props.externalIdentityId - UUID of the external identity record to
 *   update
 * @param props.body - The payload describing fields to update (provider,
 *   provider_key, last_verified_at)
 * @returns The updated external identity record
 * @throws {Error} When the external identity does not exist or doesn't belong
 *   to the customer
 */
export async function put__shoppingMallAiBackend_admin_customers_$customerId_externalIdentities_$externalIdentityId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  externalIdentityId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCustomerExternalIdentity.IUpdate;
}): Promise<IShoppingMallAiBackendCustomerExternalIdentity> {
  const { admin, customerId, externalIdentityId, body } = props;

  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.findUnique(
      {
        where: { id: externalIdentityId },
      },
    );
  if (!existing || existing.customer_id !== customerId) {
    throw new Error("Forbidden: External identity not found for this customer");
  }

  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.update(
      {
        where: { id: externalIdentityId },
        data: {
          provider: body.provider ?? undefined,
          provider_key: body.provider_key ?? undefined,
          last_verified_at:
            body.last_verified_at !== undefined
              ? body.last_verified_at === null
                ? null
                : toISOStringSafe(body.last_verified_at)
              : undefined,
        },
      },
    );

  return {
    id: updated.id,
    customer_id: updated.customer_id,
    provider: updated.provider,
    provider_key: updated.provider_key,
    linked_at: toISOStringSafe(updated.linked_at),
    last_verified_at: updated.last_verified_at
      ? toISOStringSafe(updated.last_verified_at)
      : null,
  };
}
