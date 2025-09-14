import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update product information and attributes for a specific productId in
 * ai_commerce_products.
 *
 * Edits business, pricing, inventory, and core fields per
 * IAiCommerceProduct.IUpdate. Enforces SKU uniqueness and business logic via DB
 * constraints. Disallows updates to deleted products.
 *
 * @param props - Operation props
 * @param props.admin - Authenticated administrator payload
 * @param props.productId - UUID of the product to update
 * @param props.body - Fields to update (partial IAiCommerceProduct.IUpdate)
 * @returns Full IAiCommerceProduct record with updated data
 * @throws Error When productId does not exist, or when attempting to update a
 *   logically deleted product
 */
export async function putaiCommerceAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProduct.IUpdate;
}): Promise<IAiCommerceProduct> {
  const { productId, body } = props;

  // Find existing product record by id
  const prev = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: productId },
  });
  if (!prev) throw new Error("Product not found");
  if (prev.deleted_at !== null && prev.deleted_at !== undefined) {
    throw new Error("Cannot update a deleted product");
  }

  // Prepare update fields, omitting all undefined, always updating updated_at
  const updateFields: Record<string, unknown> = {
    ...(body.product_code !== undefined && { product_code: body.product_code }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.business_status !== undefined && {
      business_status: body.business_status,
    }),
    ...(body.current_price !== undefined && {
      current_price: body.current_price,
    }),
    ...(body.inventory_quantity !== undefined && {
      inventory_quantity: body.inventory_quantity,
    }),
    ...(body.store_id !== undefined && { store_id: body.store_id }),
    // Handle deleted_at: only assign if present (can be string or null)
    ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Perform update
  const updated = await MyGlobal.prisma.ai_commerce_products.update({
    where: { id: productId },
    data: updateFields,
  });

  // Return with proper date conversions and all required fields
  return {
    id: updated.id,
    seller_id: updated.seller_id,
    store_id: updated.store_id,
    product_code: updated.product_code,
    name: updated.name,
    description: updated.description,
    status: updated.status,
    business_status: updated.business_status,
    current_price: updated.current_price,
    inventory_quantity: updated.inventory_quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
