import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new product in ai_commerce_products for a seller.
 *
 * This operation allows an authenticated seller to register a new product,
 * assigning business, pricing, and inventory details. All required fields must
 * be provided, and a unique product record will be created with initial
 * timestamps and no soft deletion.
 *
 * @param props - The invocation properties.
 * @param props.seller - Authenticated SellerPayload object representing the
 *   current seller.
 * @param props.body - Product registration data as IAiCommerceProduct.ICreate.
 * @returns {Promise<IAiCommerceProduct>} - The newly created product record.
 * @throws {Error} If a database constraint is violated (e.g., duplicate
 *   product_code).
 */
export async function postaiCommerceSellerProducts(props: {
  seller: SellerPayload;
  body: IAiCommerceProduct.ICreate;
}): Promise<IAiCommerceProduct> {
  const { seller, body } = props;
  // Generate unique product ID
  const id: string & tags.Format<"uuid"> = v4();
  // Use current time for created_at and updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the new product record via Prisma
  const created = await MyGlobal.prisma.ai_commerce_products.create({
    data: {
      id,
      seller_id: body.seller_id,
      store_id: body.store_id,
      product_code: body.product_code,
      name: body.name,
      description: body.description,
      status: body.status,
      business_status: body.business_status,
      current_price: body.current_price,
      inventory_quantity: body.inventory_quantity,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the API DTO matching IAiCommerceProduct (all date fields string format)
  return {
    id: created.id,
    seller_id: created.seller_id,
    store_id: created.store_id,
    product_code: created.product_code,
    name: created.name,
    description: created.description,
    status: created.status,
    business_status: created.business_status,
    current_price: created.current_price,
    inventory_quantity: created.inventory_quantity,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
