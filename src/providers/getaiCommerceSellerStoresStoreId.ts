import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve full store details (ai_commerce_stores table) for a given storeId.
 *
 * Returns the detailed store record for the given store ID, only if the
 * authenticated seller is the owner. Throws if store does not exist, has been
 * soft deleted, or is not owned by the requesting seller. All temporal fields
 * are returned as ISO strings. Includes only fields from IAiCommerceStores. No
 * extra relations are inlined.
 *
 * @param props - Object containing authentication payload and storeId
 * @param props.seller - Authenticated seller making the request
 * @param props.storeId - UUID of the store to retrieve
 * @returns The detailed store record as IAiCommerceStores
 * @throws {Error} If store does not exist, is soft-deleted, or access is
 *   unauthorized
 */
export async function getaiCommerceSellerStoresStoreId(props: {
  seller: SellerPayload;
  storeId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceStores> {
  const { seller, storeId } = props;

  const store = await MyGlobal.prisma.ai_commerce_stores.findFirst({
    where: {
      id: storeId,
      deleted_at: null,
    },
  });
  if (!store) {
    throw new Error("Store not found");
  }
  if (store.owner_user_id !== seller.id) {
    throw new Error("Unauthorized: You may only access your own stores");
  }
  return {
    id: store.id,
    owner_user_id: store.owner_user_id,
    seller_profile_id: store.seller_profile_id,
    store_name: store.store_name,
    store_code: store.store_code,
    store_metadata: store.store_metadata ?? undefined,
    approval_status: store.approval_status,
    closure_reason: store.closure_reason ?? undefined,
    created_at: toISOStringSafe(store.created_at),
    updated_at: toISOStringSafe(store.updated_at),
    deleted_at:
      store.deleted_at !== null && store.deleted_at !== undefined
        ? toISOStringSafe(store.deleted_at)
        : undefined,
  };
}
