import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a store (ai_commerce_stores table) identified by storeId for the
 * authenticated seller or admin.
 *
 * This endpoint allows an authenticated platform admin to update fields of a
 * store entity referenced by the given storeId. Permitted updates include
 * store_name, store_metadata, approval_status, and closure_reason. Only the
 * store owner (seller) or an admin may update a store, but this endpoint
 * exclusively permits admin role. The handler ensures type safety for all
 * updates, preserves non-updatable fields, and ensures all returned datetime
 * fields are ISO strings per system requirements. All updates are audit logged
 * for compliance.
 *
 * @param props - Request properties
 * @param props.admin - Payload of the authenticated admin performing the update
 * @param props.storeId - UUID of the store to update
 * @param props.body - Update properties as defined in IAiCommerceStores.IUpdate
 * @returns The updated store record as IAiCommerceStores
 * @throws {Error} If store does not exist or the user lacks update
 *   authorization
 */
export async function putaiCommerceAdminStoresStoreId(props: {
  admin: AdminPayload;
  storeId: string & tags.Format<"uuid">;
  body: IAiCommerceStores.IUpdate;
}): Promise<IAiCommerceStores> {
  // 1. Fetch store by ID
  const found = await MyGlobal.prisma.ai_commerce_stores.findUnique({
    where: { id: props.storeId },
  });
  if (!found) {
    throw new Error("Store not found");
  }

  // 2. Update only the explicitly provided fields
  const updated = await MyGlobal.prisma.ai_commerce_stores.update({
    where: { id: props.storeId },
    data: {
      ...(props.body.store_name !== undefined && {
        store_name: props.body.store_name,
      }),
      ...(props.body.store_metadata !== undefined && {
        store_metadata: props.body.store_metadata,
      }),
      ...(props.body.approval_status !== undefined && {
        approval_status: props.body.approval_status,
      }),
      ...(props.body.closure_reason !== undefined && {
        closure_reason: props.body.closure_reason,
      }),
    },
  });

  // 3. Audit log: record the update action (async, best-effort)
  try {
    await MyGlobal.prisma.ai_commerce_audit_logs_system.create({
      data: {
        id: v4(),
        event_type: "UPDATE_STORE",
        actor_id: props.admin.id,
        target_table: "ai_commerce_stores",
        target_id: updated.id,
        before: JSON.stringify({
          store_name: found.store_name,
          store_metadata: found.store_metadata,
          approval_status: found.approval_status,
          closure_reason: found.closure_reason,
        }),
        after: JSON.stringify({
          store_name: updated.store_name,
          store_metadata: updated.store_metadata,
          approval_status: updated.approval_status,
          closure_reason: updated.closure_reason,
        }),
        created_at: toISOStringSafe(new Date()),
      },
    });
  } catch (e) {
    // Safely ignore audit log errors to not block core function
  }

  // 4. Return updated row, strictly typed, with proper handling of optional and nullable fields.
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
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
