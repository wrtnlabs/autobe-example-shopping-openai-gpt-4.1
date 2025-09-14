import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information for a specific product by ID in
 * ai_commerce_products.
 *
 * This endpoint allows administrators to fetch the full details of any product,
 * including business, inventory, status, and audit fields. Returns all
 * attributes as specified by the IAiCommerceProduct DTO. Admins see all
 * products, regardless of soft-deletion (deleted_at).
 *
 * @param props - Request payload
 * @param props.admin - Authenticated administrator payload for global access
 * @param props.productId - UUID of the product to retrieve
 * @returns Complete information of the specified product for authorized admin
 *   role
 * @throws {Error} If no product with the given ID exists
 */
export async function getaiCommerceAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProduct> {
  const { productId } = props;
  const record = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: productId },
  });
  if (!record) {
    throw new Error("Product not found");
  }
  return {
    id: record.id,
    seller_id: record.seller_id,
    store_id: record.store_id,
    product_code: record.product_code,
    name: record.name,
    description: record.description,
    status: record.status,
    business_status: record.business_status,
    current_price: record.current_price,
    inventory_quantity: record.inventory_quantity,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    // deleted_at is optional | null | undefined in DTO, schema emits Date | null
    deleted_at:
      record.deleted_at != null
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
