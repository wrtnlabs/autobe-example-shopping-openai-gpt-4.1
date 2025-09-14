import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new sub-order for a given order (ai_commerce_sub_orders) — admin
 * only.
 *
 * This function creates a new sub-order associated with a parent order. It
 * enforces referential integrity by verifying that the parent order and seller
 * exist, checks for duplicate suborder_code per parent order, and populates all
 * required and optional fields with strict type compliance. Date/time values
 * are converted to ISO 8601 format and no native Date type or direct type
 * assertions are used. This function may only be invoked by authenticated
 * admins.
 *
 * @param props - Props for sub-order creation
 * @param props.admin - The authenticated admin requesting the creation
 * @param props.orderId - The parent order ID to which the sub-order is attached
 * @param props.body - Sub-order creation data (IAiCommerceSubOrder.ICreate)
 * @returns The created IAiCommerceSubOrder entity
 * @throws {Error} If the parent order does not exist
 * @throws {Error} If the seller does not exist
 * @throws {Error} If a suborder with the same suborder_code already exists for
 *   the provided order
 */
export async function postaiCommerceAdminOrdersOrderIdSubOrders(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceSubOrder.ICreate;
}): Promise<IAiCommerceSubOrder> {
  const { admin, orderId, body } = props;
  // Validate parent order existence
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: { id: orderId },
  });
  if (!order) {
    throw new Error("Parent order does not exist");
  }

  // Validate seller existence
  const seller = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: { id: body.seller_id },
  });
  if (!seller) {
    throw new Error("Seller does not exist");
  }

  // Ensure suborder_code is unique for this order
  const duplicate = await MyGlobal.prisma.ai_commerce_sub_orders.findFirst({
    where: {
      order_id: orderId,
      suborder_code: body.suborder_code,
    },
  });
  if (duplicate) {
    throw new Error("Duplicate suborder_code for this order");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.ai_commerce_sub_orders.create({
    data: {
      id: v4(),
      order_id: orderId,
      seller_id: body.seller_id,
      suborder_code: body.suborder_code,
      status: body.status,
      shipping_method: body.shipping_method ?? null,
      tracking_number: body.tracking_number ?? null,
      total_price: body.total_price,
      created_at: now,
      updated_at: now,
    },
  });

  // Map all date and optional/nullable fields for DTO
  return {
    id: created.id,
    order_id: created.order_id,
    seller_id: created.seller_id,
    suborder_code: created.suborder_code,
    status: created.status,
    shipping_method:
      created.shipping_method === undefined
        ? undefined
        : created.shipping_method,
    tracking_number:
      created.tracking_number === undefined
        ? undefined
        : created.tracking_number,
    total_price: created.total_price,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === undefined || created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
