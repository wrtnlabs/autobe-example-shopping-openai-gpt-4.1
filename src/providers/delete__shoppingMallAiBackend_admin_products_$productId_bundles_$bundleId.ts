import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a specific product bundle (SKU/variant) for a given product by
 * marking the record as deleted via the deleted_at column.
 *
 * This is a logical (soft) deletion, preserving audit and business evidence
 * while preventing further sale of the variant. Only platform admins may invoke
 * this operation.
 *
 * Business logic enforces:
 *
 * - Only product bundles matching the given bundleId and belonging to the
 *   productId may be deleted.
 * - Soft delete performed by setting deleted_at to current UTC datetime string.
 * - Will throw if the bundle is not found or is already deleted.
 *
 * @param props - Properties for this request
 * @param props.admin - Authenticated admin performing the operation
 * @param props.productId - UUID of parent product
 * @param props.bundleId - UUID of bundle to be deleted
 * @returns Void
 * @throws {Error} When no matching bundle exists (not found or already deleted)
 */
export async function delete__shoppingMallAiBackend_admin_products_$productId_bundles_$bundleId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, productId, bundleId } = props;

  // Locate the specific non-deleted bundle for this product
  const bundle =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.findFirst({
      where: {
        id: bundleId,
        shopping_mall_ai_backend_products_id: productId,
        deleted_at: null,
      },
    });

  if (!bundle) {
    throw new Error("Product bundle not found or already deleted");
  }

  // Soft delete: mark deleted_at as now
  await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.update({
    where: {
      id: bundleId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
