import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently erase (soft delete) a product by productId in
 * ai_commerce_products (admin only).
 *
 * This endpoint permanently marks the specified product as deleted by setting
 * its deleted_at timestamp. Only system administrators (admin role) may perform
 * this action. If the product is currently referenced in any order item (active
 * or historical), or is under active compliance lock (not approved), the
 * deletion is rejected and an error is thrown. If the product is not found or
 * already deleted, an error is also thrown.
 *
 * Associated product variants are checked for order references. The product is
 * soft-deleted (deleted_at is set), and no physical delete is performed. All
 * audit, compliance, and legal records are retained.
 *
 * @param props - Object containing:
 *
 *   - Admin: The authenticated administrator (system-level authorization)
 *   - ProductId: Unique identifier of the product to delete (UUID)
 *
 * @returns Void
 * @throws {Error} If the product does not exist, is already deleted, is
 *   referenced in any order, or is under active compliance lock
 */
export async function deleteaiCommerceAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, productId } = props;

  // 1. Find the product: if not found or already deleted, error
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
    select: { id: true }, // minimal fetch
  });
  if (!product) {
    throw new Error("Product not found or already deleted");
  }

  // 2. Find related variants for this product
  const variants = await MyGlobal.prisma.ai_commerce_product_variants.findMany({
    where: { product_id: productId },
    select: { id: true },
  });
  if (variants.length > 0) {
    const variantIds = variants.map((variant) => variant.id);
    // 3. Check if any order items reference these variants
    const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
      where: {
        product_variant_id: { in: variantIds },
      },
      select: { id: true },
    });
    if (orderItem) {
      throw new Error(
        "Product is referenced in one or more orders and cannot be deleted",
      );
    }
  }

  // 4. Check compliance lock (must not be under compliance lock)
  const compliance =
    await MyGlobal.prisma.ai_commerce_product_legal_compliance.findFirst({
      where: {
        product_id: productId,
        compliance_status: { not: "approved" },
      },
      select: { id: true, compliance_status: true },
    });
  if (compliance) {
    throw new Error(
      "Product is under active compliance lock and cannot be deleted",
    );
  }

  // 5. Soft-delete (update deleted_at with current time as string & tags.Format<'date-time'>)
  await MyGlobal.prisma.ai_commerce_products.update({
    where: { id: productId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
