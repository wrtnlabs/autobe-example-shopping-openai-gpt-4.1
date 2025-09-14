import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full store details (ai_commerce_stores table) for a given storeId.
 *
 * This operation retrieves detailed store information from ai_commerce_stores
 * for a specific storeId. The operation validates that the requesting user is
 * authorized—sellers can view only their stores, admins can view any. The
 * detail includes all basic fields, and (per DTO definition) does not include
 * explicit relational data, but rather maps only those store fields present in
 * IAiCommerceStores. Security is enforced by the AdminAuth decorator, ensuring
 * only active system admins can access this endpoint. If the store does not
 * exist or is soft-deleted, an error is thrown.
 *
 * @param props - The props containing the admin payload and a storeId (UUID
 *   format)
 * @param props.admin - Authenticated AdminPayload, injected from AdminAuth
 * @param props.storeId - UUID of the store to retrieve
 * @returns The detailed IAiCommerceStores record matching the ID
 * @throws {Error} When the store does not exist or has been deleted
 */
export async function getaiCommerceAdminStoresStoreId(props: {
  admin: AdminPayload;
  storeId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceStores> {
  const { storeId } = props;
  const store = await MyGlobal.prisma.ai_commerce_stores.findFirst({
    where: { id: storeId, deleted_at: null },
  });
  if (store == null) {
    throw new Error("Store not found");
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
    deleted_at: store.deleted_at
      ? toISOStringSafe(store.deleted_at)
      : undefined,
  };
}
