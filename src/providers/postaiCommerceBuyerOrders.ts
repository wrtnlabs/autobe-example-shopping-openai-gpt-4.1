import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new purchase order for the buyer, using current cart context.
 *
 * This endpoint creates a new order for the authenticated buyer, populating all
 * required fields, initializing payment and delivery status, and ensuring
 * atomic creation of the order and all child order items. The operation
 * validates the creation payload strictly, enforces buyer ownership and ID
 * assignment, and snapshots both temporal and business state for fulfillment,
 * audit, and legal purposes. All date/datetime values use string &
 * tags.Format<'date-time'>. No native Date type or as-type assertions are used
 * anywhere except for UUID generation, where it is required to produce branded
 * uuid values.
 *
 * @param props - Operation properties
 * @param props.buyer - The authenticated buyer context
 * @param props.body - IAiCommerceOrder.ICreate, validated and authorized input
 *   for new order
 * @returns IAiCommerceOrder - The newly persisted order, with proper
 *   null/undefined field handling
 * @throws Error if creation fails or transaction is rolled back
 */
export async function postaiCommerceBuyerOrders(props: {
  buyer: BuyerPayload;
  body: IAiCommerceOrder.ICreate;
}): Promise<IAiCommerceOrder> {
  // Always use a single consistent timestamp for initial entries
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const orderId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  // Atomically create order and items
  const [createdOrder] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ai_commerce_orders.create({
      data: {
        id: orderId,
        buyer_id: props.buyer.id,
        channel_id: props.body.channel_id,
        order_code: props.body.order_code,
        status: props.body.status,
        total_price: props.body.total_price,
        paid_amount: 0,
        currency: props.body.currency,
        address_snapshot_id: props.body.address_snapshot_id,
        created_at: now,
        updated_at: now,
        ai_commerce_order_items: {
          create: props.body.ai_commerce_order_items.map((item) => ({
            id: v4() as string & tags.Format<"uuid">,
            product_variant_id: item.product_variant_id,
            seller_id: item.seller_id ?? undefined,
            item_code: item.item_code,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            delivery_status: "pending",
            created_at: now,
            updated_at: now,
          })),
        },
      },
    }),
  ]);

  // Build IAiCommerceOrder object from DB response, strict on null vs undefined
  return {
    id: createdOrder.id,
    buyer_id: createdOrder.buyer_id,
    channel_id: createdOrder.channel_id,
    order_code: createdOrder.order_code,
    status: createdOrder.status,
    business_status: createdOrder.business_status ?? undefined,
    total_price: createdOrder.total_price,
    paid_amount: createdOrder.paid_amount,
    currency: createdOrder.currency,
    address_snapshot_id: createdOrder.address_snapshot_id,
    created_at: toISOStringSafe(createdOrder.created_at),
    updated_at: toISOStringSafe(createdOrder.updated_at),
    deleted_at: createdOrder.deleted_at
      ? toISOStringSafe(createdOrder.deleted_at)
      : undefined,
  };
}
