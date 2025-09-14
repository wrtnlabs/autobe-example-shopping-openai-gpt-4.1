import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Permanently delete a store (ai_commerce_stores table) by storeId (hard
 * delete).
 *
 * This operation performs a hard delete from ai_commerce_stores, ensuring the
 * requester is the store owner (seller). It validates there are no dependent
 * entities (products, carts, store settings, analytics, banking, templates)
 * that would violate referential integrity before deletion. All delete
 * operations are strictly audit logged for compliance and legal.
 *
 * @param props - Object with seller authentication payload and storeId
 * @param props.seller - The authenticated seller (payload with id, type)
 * @param props.storeId - Target store UUID to delete
 * @returns Void
 * @throws {Error} If unauthorized, store not found, or dependent entities are
 *   found.
 */
export async function deleteaiCommerceSellerStoresStoreId(props: {
  seller: SellerPayload;
  storeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, storeId } = props;

  // 1. Fetch the target store; throws if not found
  const store = await MyGlobal.prisma.ai_commerce_stores.findUniqueOrThrow({
    where: { id: storeId },
    select: {
      id: true,
      owner_user_id: true,
      seller_profile_id: true,
    },
  });

  // 2. Only the owner seller may delete
  if (store.owner_user_id !== seller.id) {
    throw new Error(
      "Unauthorized: Only the store owner can delete this store.",
    );
  }

  // 3. Dependency checks: all dependent entities must be removed before deletion
  const dependencies = [
    {
      model: "product",
      count: await MyGlobal.prisma.ai_commerce_products.count({
        where: { store_id: storeId },
      }),
    },
    {
      model: "cart",
      count: await MyGlobal.prisma.ai_commerce_carts.count({
        where: { store_id: storeId },
      }),
    },
    {
      model: "store_setting",
      count: await MyGlobal.prisma.ai_commerce_store_settings.count({
        where: { store_id: storeId },
      }),
    },
    {
      model: "store_analytics",
      count: await MyGlobal.prisma.ai_commerce_store_analytics.count({
        where: { store_id: storeId },
      }),
    },
    {
      model: "store_banking",
      count: await MyGlobal.prisma.ai_commerce_store_banking.count({
        where: { store_id: storeId },
      }),
    },
    {
      model: "cart_template",
      count: await MyGlobal.prisma.ai_commerce_cart_templates.count({
        where: { store_id: storeId },
      }),
    },
  ];
  for (const dep of dependencies) {
    if (dep.count > 0) {
      throw new Error(
        `Cannot delete store: existing dependent entities found in ${dep.model} (${dep.count}).`,
      );
    }
  }

  // 4. Delete the store (hard delete)
  await MyGlobal.prisma.ai_commerce_stores.delete({
    where: { id: storeId },
  });

  // 5. Audit log (all fields explicit, with full branding and safe handling)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_audit_logs_seller.create({
    data: {
      id: v4(),
      seller_profile_id: store.seller_profile_id,
      event_type: "store_deleted",
      event_data: JSON.stringify({ storeId }),
      actor: seller.id,
      created_at: now,
    },
  });
}
