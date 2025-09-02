import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get specific external identity provider info for a customer.
 *
 * This endpoint allows an authenticated admin to retrieve details of a specific
 * external identity (OAuth/social login) record linked to a given customer. It
 * fetches by externalIdentityId, ensures the record belongs to the specified
 * customerId, and returns all relevant fields per
 * IShoppingMallAiBackendCustomerExternalIdentity.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication (must be active, ensures only admin
 *   can access)
 * @param props.customerId - UUID of the customer who owns the external identity
 * @param props.externalIdentityId - UUID of the external identity to fetch
 * @returns The external identity record with provider, keys, linkage and
 *   verification timestamps
 * @throws {Error} If the external identity is not found or does not belong to
 *   the specified customer
 */
export async function get__shoppingMallAiBackend_admin_customers_$customerId_externalIdentities_$externalIdentityId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  externalIdentityId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCustomerExternalIdentity> {
  const { customerId, externalIdentityId } = props;

  // Fetch the external identity ensuring correct ownership
  const entity =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.findFirst(
      {
        where: {
          id: externalIdentityId,
          customer_id: customerId,
        },
      },
    );
  if (!entity) {
    throw new Error(
      "External identity not found or does not belong to specified customer.",
    );
  }
  return {
    id: entity.id,
    customer_id: entity.customer_id,
    provider: entity.provider,
    provider_key: entity.provider_key,
    linked_at: toISOStringSafe(entity.linked_at),
    last_verified_at:
      entity.last_verified_at !== null && entity.last_verified_at !== undefined
        ? toISOStringSafe(entity.last_verified_at)
        : null,
  };
}
