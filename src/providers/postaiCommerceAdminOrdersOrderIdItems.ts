import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new order item under a given order (ai_commerce_order_items) —
 * admin/system/internal only.
 *
 * This operation registers a new line item for an existing order, usable only
 * by administrators or internal flows. The function enforces strict referential
 * integrity to the parent order and referenced product variant, validates
 * business rules (such as quantity/price correctness, status eligibility, and
 * duplicate prevention), and returns a full IAiCommerceOrderItem object. All
 * date fields are converted to strings using toISOStringSafe and typed
 * precisely. No native Date or as assertions are used.
 *
 * @param props - Operation parameters
 * @param props.admin - Authenticated admin payload (role enforcement and audit)
 * @param props.orderId - UUID of the target parent order
 * @param props.body - Order item creation request; must match
 *   IAiCommerceOrderItem.ICreate
 * @returns Complete IAiCommerceOrderItem record reflecting database state
 * @throws {Error} If the order does not exist, is finalized/locked, product
 *   variant is invalid, validation fails, or item is duplicate
 */
export async function postaiCommerceAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderItem.ICreate;
}): Promise<IAiCommerceOrderItem> {
  const { admin, orderId, body } = props;

  // Step 1: Verify parent order exists and is modifiable
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: { id: orderId, deleted_at: null },
    select: { id: true, status: true },
  });
  if (!order) throw new Error("Order not found or deleted");
  if (["completed", "locked", "cancelled", "closed"].includes(order.status)) {
    throw new Error("Order is finalized or not eligible for modification");
  }

  // Step 2: Validate product variant existence and 'active' status
  const productVariant =
    await MyGlobal.prisma.ai_commerce_product_variants.findFirst({
      where: {
        id: body.product_variant_id,
        deleted_at: null,
        status: "active",
      },
      select: { id: true },
    });
  if (!productVariant) throw new Error("Invalid or inactive product variant");

  // Step 3: Validate business logic (quantity/price)
  if (typeof body.quantity !== "number" || body.quantity <= 0) {
    throw new Error("Invalid quantity: must be positive");
  }
  if (typeof body.unit_price !== "number" || body.unit_price <= 0) {
    throw new Error("Invalid unit price: must be positive");
  }
  if (
    typeof body.total_price !== "number" ||
    body.total_price !== body.unit_price * body.quantity
  ) {
    throw new Error("Total price must be unit_price × quantity");
  }

  // Step 4: Prevent duplicate product_variant_id for this order (business: one of a kind per order)
  const duplicate = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      order_id: orderId,
      product_variant_id: body.product_variant_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error("This product variant is already attached to this order");
  }

  // Step 5: Set timestamps and IDs for new row (ISO string, never raw Date)
  const now = toISOStringSafe(new Date());
  const id = v4();

  // Step 6: Insert new order item
  const created = await MyGlobal.prisma.ai_commerce_order_items.create({
    data: {
      id,
      order_id: orderId,
      product_variant_id: body.product_variant_id,
      seller_id: body.seller_id === undefined ? undefined : body.seller_id,
      item_code: body.item_code,
      name: body.name,
      quantity: body.quantity,
      unit_price: body.unit_price,
      total_price: body.total_price,
      delivery_status: "pending", // Use 'pending' as initial delivery state
      created_at: now,
      updated_at: now,
    },
  });

  // Step 7: Return full DTO with correct type, null/undefined consistency
  return {
    id: created.id,
    order_id: created.order_id,
    product_variant_id: created.product_variant_id,
    seller_id: created.seller_id ?? undefined,
    item_code: created.item_code,
    name: created.name,
    quantity: created.quantity,
    unit_price: created.unit_price,
    total_price: created.total_price,
    delivery_status: created.delivery_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
