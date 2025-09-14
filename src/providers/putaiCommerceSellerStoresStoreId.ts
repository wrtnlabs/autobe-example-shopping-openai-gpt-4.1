import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Updates a store (ai_commerce_stores) identified by storeId for the
 * authenticated seller.
 *
 * Allows updating store_name, store_metadata, approval_status, and
 * closure_reason for an existing store. Only the owner can update the store.
 * Throws if not found, deleted, or not owned by the seller. Returns the updated
 * store after applying changes, with all date fields as ISO 8601 branded
 * strings.
 *
 * @param props - Object containing authenticated seller, storeId, and update
 *   payload.
 *
 *   - Props.seller: Authenticated SellerPayload (must own the store)
 *   - Props.storeId: UUID of the store to be updated
 *   - Props.body: Partial fields to update (store_name, store_metadata,
 *       approval_status, closure_reason)
 *
 * @returns Store object (IAiCommerceStores) with changes applied
 * @throws {Error} If not found, deleted, or forbidden by ownership rules
 */
export async function putaiCommerceSellerStoresStoreId(props: {
  seller: SellerPayload;
  storeId: string & tags.Format<"uuid">;
  body: IAiCommerceStores.IUpdate;
}): Promise<IAiCommerceStores> {
  const { seller, storeId, body } = props;

  // Fetch the store; ensure not deleted and exists
  const store = await MyGlobal.prisma.ai_commerce_stores.findFirst({
    where: { id: storeId, deleted_at: null },
  });
  if (!store) throw new Error("Store not found or deleted");

  // Only the owner can update
  if (store.owner_user_id !== seller.id)
    throw new Error("Forbidden: Only the owner can update this store");

  // Prepare updated fields; skip undefined for updates, propagate explicit nulls (for optionals)
  const updated = await MyGlobal.prisma.ai_commerce_stores.update({
    where: { id: storeId },
    data: {
      store_name: body.store_name ?? undefined,
      store_metadata: body.store_metadata ?? undefined,
      approval_status: body.approval_status ?? undefined,
      closure_reason: body.closure_reason ?? undefined,
    },
  });
  // Return object in strict IAiCommerceStores structure; all datetimes as ISO format
  return {
    id: updated.id,
    owner_user_id: updated.owner_user_id,
    seller_profile_id: updated.seller_profile_id,
    store_name: updated.store_name,
    store_code: updated.store_code,
    store_metadata: updated.store_metadata ?? undefined,
    approval_status: updated.approval_status,
    closure_reason: updated.closure_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
