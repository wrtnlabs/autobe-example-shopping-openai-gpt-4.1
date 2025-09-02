import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves details for a given external identity linked to a specific customer
 * by externalIdentityId.
 *
 * Enables an authenticated customer to review the properties of a linked
 * OAuth/social account, including provider, key, linkage, and verification
 * timestamps. Only the owning customer may access this identity. Access by
 * other users is forbidden.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer payload (must match the target
 *   customerId to authorize access)
 * @param props.customerId - UUID of the customer who owns the external identity
 * @param props.externalIdentityId - UUID of the external identity record to
 *   retrieve
 * @returns Full details of the specified external identity mapping, including
 *   linkage metadata, per IShoppingMallAiBackendCustomerExternalIdentity
 * @throws {Error} If customer does not match target path or external identity
 *   does not exist or does not belong to customer
 */
export async function get__shoppingMallAiBackend_customer_customers_$customerId_externalIdentities_$externalIdentityId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  externalIdentityId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCustomerExternalIdentity> {
  const { customer, customerId, externalIdentityId } = props;
  // Authorization: customer can only access their own external identities
  if (customer.id !== customerId) {
    throw new Error(
      "Forbidden: You can only view your own external identities",
    );
  }
  const record =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.findUnique(
      {
        where: { id: externalIdentityId },
      },
    );
  if (!record || record.customer_id !== customerId) {
    throw new Error("Not found or does not belong to this customer");
  }
  return {
    id: record.id,
    customer_id: record.customer_id,
    provider: record.provider,
    provider_key: record.provider_key,
    linked_at: toISOStringSafe(record.linked_at),
    last_verified_at:
      record.last_verified_at != null
        ? toISOStringSafe(record.last_verified_at)
        : null,
  };
}
