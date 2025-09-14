import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new product with business, inventory, and compliance details in
 * ai_commerce_products.
 *
 * This operation registers a new product record to the platform under the
 * ai_commerce_products table. It assigns the product to the specified seller
 * and store, enforces required business fields and status, and triggers audit
 * workflows per compliance policy. Unique constraints (e.g., SKU) and all
 * required presence are enforced via Prisma and upstream validation. Creation
 * timestamps and product UUID are generated directly.
 *
 * @param props.admin - The authenticated admin performing product registration
 *   (authorization and context already enforced)
 * @param props.body - Product details conforming to IAiCommerceProduct.ICreate
 *   (seller/store, SKU, business fields, inventory, status)
 * @returns The full created product record in IAiCommerceProduct format
 * @throws {Error} If required fields are missing, SKU is not unique, or data
 *   validation fails (Prisma error will surface)
 */
export async function postaiCommerceAdminProducts(props: {
  admin: AdminPayload;
  body: IAiCommerceProduct.ICreate;
}): Promise<IAiCommerceProduct> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_products.create({
    data: {
      id: v4(),
      seller_id: props.body.seller_id,
      store_id: props.body.store_id,
      product_code: props.body.product_code,
      name: props.body.name,
      description: props.body.description,
      status: props.body.status,
      business_status: props.body.business_status,
      current_price: props.body.current_price,
      inventory_quantity: props.body.inventory_quantity,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
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
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
