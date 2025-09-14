import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a store (hard delete, no soft delete logic).
 *
 * This operation allows an authenticated admin to hard-delete a store
 * identified by storeId from the ai_commerce_stores table. It checks for
 * dependent records (products, carts, store settings, analytics) and throws an
 * error if any exist, preserving referential integrity.
 *
 * Upon success, the store is removed and an audit log of type DELETE_STORE_HARD
 * is written for compliance.
 *
 * @param props - The operation input
 * @param props.admin - Authenticated admin payload
 * @param props.storeId - The UUID of the store to delete
 * @returns Void
 * @throws {Error} If the store does not exist, has already been deleted, or has
 *   active dependents
 */
export async function deleteaiCommerceAdminStoresStoreId(props: {
  admin: AdminPayload;
  storeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, storeId } = props;

  const store = await MyGlobal.prisma.ai_commerce_stores.findFirst({
    where: { id: storeId, deleted_at: null },
  });
  if (store === null) {
    throw new Error("Store not found or already deleted");
  }

  // Check for dependent entities in child tables
  const [productCount, cartCount, settingsCount, analyticsCount] =
    await Promise.all([
      MyGlobal.prisma.ai_commerce_products.count({
        where: { store_id: storeId },
      }),
      MyGlobal.prisma.ai_commerce_carts.count({ where: { store_id: storeId } }),
      MyGlobal.prisma.ai_commerce_store_settings.count({
        where: { store_id: storeId },
      }),
      MyGlobal.prisma.ai_commerce_store_analytics.count({
        where: { store_id: storeId },
      }),
    ]);
  if (
    productCount > 0 ||
    cartCount > 0 ||
    settingsCount > 0 ||
    analyticsCount > 0
  ) {
    throw new Error("Cannot delete store with dependent records present");
  }

  // Hard delete the store
  await MyGlobal.prisma.ai_commerce_stores.delete({ where: { id: storeId } });

  // Strict audit log for compliance
  await MyGlobal.prisma.ai_commerce_audit_logs_system.create({
    data: {
      id: v4(),
      event_type: "DELETE_STORE_HARD",
      actor_id: admin.id,
      target_table: "ai_commerce_stores",
      target_id: storeId,
      before: JSON.stringify(store),
      after: null,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
