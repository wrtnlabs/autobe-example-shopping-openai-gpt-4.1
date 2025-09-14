import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update product information and attributes for a specific productId in
 * ai_commerce_products.
 *
 * Edits core business fields, stock, pricing, and status for the identified
 * product. Sellers may only edit their own non-deleted products. Field changes
 * support both partial update and soft deletion/restore via deleted_at. System
 * always updates the updated_at timestamp. All updates are strictly typesafe,
 * with no use of native Date type or unsafe assertions. Returns the complete
 * updated product record.
 *
 * @param props - Object with seller authentication context, productId as UUID,
 *   and body of fields to update.
 * @param props.seller - SellerPayload (authenticated seller principal)
 * @param props.productId - UUID of product being updated
 * @param props.body - IAiCommerceProduct.IUpdate fields (partial set)
 * @returns The updated IAiCommerceProduct reflecting all changes
 * @throws {Error} If the product does not exist, is not owned by the seller, or
 *   is deleted
 */
export async function putaiCommerceSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProduct.IUpdate;
}): Promise<IAiCommerceProduct> {
  const { seller, productId, body } = props;
  // 1. Find the product by ID, restricted to current seller, not soft-deleted
  const existing = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!existing)
    throw new Error("Product not found, not owned by seller, or deleted.");

  // 2. Compose update object from provided body fields (partial patch). System always sets updated_at.
  const update: IAiCommerceProduct.IUpdate = {
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
    // Soft-delete or restore logic: only touch deleted_at if present in body
    ...(Object.prototype.hasOwnProperty.call(body, "deleted_at") && {
      deleted_at: body.deleted_at,
    }),
    // Force system updated_at over any user-provided value
    updated_at: toISOStringSafe(new Date()),
  };

  // 3. Apply update
  const updated = await MyGlobal.prisma.ai_commerce_products.update({
    where: { id: productId },
    data: update,
  });

  // 4. Map DB record to API type, converting dates properly
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
