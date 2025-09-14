import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Place (create) a new order through checkout (ai_commerce_orders).
 *
 * This operation creates a new order record for the platform, validating
 * inventory, required relationships, and atomic item assignment as per
 * enterprise e-commerce business logic. It enforces all transactional, data
 * integrity, and compliance rules—ensuring referenced buyer, channel, address
 * snapshot, and all variants exist, and that each variant has sufficient
 * inventory. All date/time and IDs are strictly branded per system
 * requirement.
 *
 * @param props - Parameters for order creation
 * @param props.admin - Admin authentication token; required for performing
 *   order creation
 * @param props.body - The IAiCommerceOrder.ICreate value for the new order and
 *   items. All business logic is enforced before writing.
 * @returns The newly created IAiCommerceOrder record, strictly mapped by type
 *   definition.
 * @throws {Error} When buyer/channel/address snapshot is missing, or any
 *   requested item cannot be fulfilled due to insufficient inventory, or upon
 *   any atomic operation failure.
 */
export async function postaiCommerceAdminOrders(props: {
  admin: AdminPayload;
  body: IAiCommerceOrder.ICreate;
}): Promise<IAiCommerceOrder> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const orderId: string & tags.Format<"uuid"> = v4();
  const { body } = props;

  // Validate existence of buyer, channel, address snapshot
  const [buyer, channel, addressSnapshot] = await Promise.all([
    MyGlobal.prisma.ai_commerce_buyer.findFirst({
      where: { id: body.buyer_id, deleted_at: null },
    }),
    MyGlobal.prisma.ai_commerce_channels.findFirst({
      where: { id: body.channel_id, deleted_at: null },
    }),
    MyGlobal.prisma.ai_commerce_user_address_snapshots.findFirst({
      where: { id: body.address_snapshot_id },
    }),
  ]);
  if (!buyer) throw new Error("Buyer not found or deleted");
  if (!channel) throw new Error("Channel not found or deleted");
  if (!addressSnapshot) throw new Error("Address snapshot not found");

  // Validate inventory for all items (must be done before transaction to prevent partial side-effects)
  // This does not lock rows, but is a business workflow step
  // If you want to avoid lost-update/concurrency issues, implement DB-level locking (not in this method)
  await Promise.all(
    body.ai_commerce_order_items.map(async (item) => {
      const variant =
        await MyGlobal.prisma.ai_commerce_product_variants.findFirst({
          where: { id: item.product_variant_id, deleted_at: null },
        });
      if (!variant)
        throw new Error(`Product variant ${item.product_variant_id} not found`);
      if (variant.inventory_quantity < item.quantity)
        throw new Error(
          `Insufficient inventory for variant ${item.product_variant_id}`,
        );
      // NOTE: This example does not update/decrement inventory, as that is likely handled elsewhere (shipment/payment step)
      return null;
    }),
  );

  // Transaction: create order and all items atomically
  const createdOrder = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.ai_commerce_orders.create({
      data: {
        id: orderId,
        buyer_id: body.buyer_id,
        channel_id: body.channel_id,
        order_code: body.order_code,
        status: body.status,
        business_status: undefined, // Start with undefined; can be updated by business logic later
        total_price: body.total_price,
        paid_amount: 0, // At creation, paid amount is 0; payment step comes after
        currency: body.currency,
        address_snapshot_id: body.address_snapshot_id,
        created_at: now,
        updated_at: now,
        // deleted_at not set at creation
      },
    });
    for (const item of body.ai_commerce_order_items) {
      await tx.ai_commerce_order_items.create({
        data: {
          id: v4(),
          order_id: orderId,
          product_variant_id: item.product_variant_id,
          seller_id: item.seller_id ?? undefined,
          item_code: item.item_code,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          created_at: now,
          updated_at: now,
        },
      });
    }
    return tx.ai_commerce_orders.findFirst({ where: { id: orderId } });
  });

  if (!createdOrder) throw new Error("Order creation failed");

  // Output as IAiCommerceOrder; all IDs and dates properly branded, no type assertions.
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
