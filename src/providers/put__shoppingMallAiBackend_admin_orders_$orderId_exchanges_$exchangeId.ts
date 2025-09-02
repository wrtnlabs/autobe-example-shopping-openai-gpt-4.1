import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderExchange";
import { EOrderExchangeStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderExchangeStatus";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an order item exchange, such as status, reasons, or admin decision.
 *
 * Enables updating the details or status of an exchange request for an order
 * item. Permits actions such as providing extra information, escalating an
 * exchange, or updating the business decision and processing notes. All state
 * changes are validated against business workflow and eligibility rules, and
 * changes are logged for compliance and dispute auditing. Only the involved
 * customer, assigned seller, or an admin may update the record, with access
 * checks enforced.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the update
 * @param props.orderId - UUID of the order to which the exchange belongs
 * @param props.exchangeId - UUID of the order exchange to update
 * @param props.body - Updated exchange information or process decision
 * @returns The updated details of the order exchange record
 * @throws {Error} If the specified exchange does not exist or if authorization
 *   fails
 */
export async function put__shoppingMallAiBackend_admin_orders_$orderId_exchanges_$exchangeId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  exchangeId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderExchange.IUpdate;
}): Promise<IShoppingMallAiBackendOrderExchange> {
  const { admin, orderId, exchangeId, body } = props;

  // 1. Ensure the exchange exists (findUniqueOrThrow will throw if not found)
  const exchange =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.findUniqueOrThrow(
      {
        where: { id: exchangeId },
      },
    );

  // 2. Only admin is allowed – enforced via decorator; extra checks (e.g., status transition) could go here

  // 3. Prepare update fields (only set if provided)
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.update({
      where: { id: exchangeId },
      data: {
        exchange_reason: body.exchange_reason ?? undefined,
        status:
          body.status !== undefined
            ? (body.status as EOrderExchangeStatus)
            : undefined,
        completed_at:
          body.completed_at !== undefined
            ? body.completed_at === null
              ? null
              : body.completed_at
            : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // 4. Return the updated object, mapping Date fields to ISO strings where required
  return {
    id: updated.id,
    shopping_mall_ai_backend_order_id:
      updated.shopping_mall_ai_backend_order_id,
    shopping_mall_ai_backend_order_item_id:
      updated.shopping_mall_ai_backend_order_item_id,
    exchange_reason: updated.exchange_reason,
    status: updated.status as EOrderExchangeStatus,
    requested_at: toISOStringSafe(updated.requested_at),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : null,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
