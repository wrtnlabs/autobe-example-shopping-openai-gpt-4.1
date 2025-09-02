import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Update the mapping/properties for a customer's external identity record.
 *
 * This endpoint enables update of properties for a linked external identity,
 * such as last verification time, provider key, or correction of external
 * account linkage problems. Only the owner (customer) may perform this
 * update—the customerId in the path and the authenticated customer's id must
 * match, otherwise the update is forbidden. The request payload follows
 * IShoppingMallAiBackendCustomerExternalIdentity.IUpdate, and only provided
 * fields are patched. Returns the complete updated identity on success.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.customerId - UUID of the customer who owns the external identity
 *   (must match the authenticated customer)
 * @param props.externalIdentityId - UUID of the external identity record to
 *   update
 * @param props.body - Patch information for the external identity mapping
 *   (provider, provider_key, last_verified_at)
 * @returns The updated external identity record
 * @throws {Error} When the record is not found or the user is unauthorized to
 *   perform the update
 */
export async function put__shoppingMallAiBackend_customer_customers_$customerId_externalIdentities_$externalIdentityId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  externalIdentityId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCustomerExternalIdentity.IUpdate;
}): Promise<IShoppingMallAiBackendCustomerExternalIdentity> {
  const { customer, customerId, externalIdentityId, body } = props;

  // Step 1: Find the external identity record by id
  const identity =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.findUnique(
      {
        where: { id: externalIdentityId },
      },
    );
  if (identity === null) {
    throw new Error("External identity not found");
  }
  // Step 2: Enforce ownership (customer-only)
  if (identity.customer_id !== customerId || customer.id !== customerId) {
    throw new Error(
      "Forbidden: You can only update your own external identities",
    );
  }

  // Step 3: Patch only fields provided
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.update(
      {
        where: { id: externalIdentityId },
        data: {
          provider: body.provider ?? undefined,
          provider_key: body.provider_key ?? undefined,
          // Must allow explicit null for last_verified_at
          last_verified_at:
            body.last_verified_at !== undefined
              ? body.last_verified_at
              : undefined,
        },
      },
    );

  // Step 4: Map to DTO, converting date fields
  return {
    id: updated.id,
    customer_id: updated.customer_id,
    provider: updated.provider,
    provider_key: updated.provider_key,
    linked_at: toISOStringSafe(updated.linked_at),
    last_verified_at:
      updated.last_verified_at !== null &&
      updated.last_verified_at !== undefined
        ? toISOStringSafe(updated.last_verified_at)
        : null,
  };
}
