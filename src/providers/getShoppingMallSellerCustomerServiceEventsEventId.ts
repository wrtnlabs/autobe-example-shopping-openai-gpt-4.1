import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerServiceEvent";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerCustomerServiceEventsEventId(props: {
  seller: SellerPayload;
  eventId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerServiceEvent> {
  // 1. Find the service event by eventId
  const event =
    await MyGlobal.prisma.shopping_mall_customer_service_events.findUnique({
      where: { id: props.eventId },
    });
  if (!event) {
    throw new HttpException("Customer service event not found", 404);
  }
  // 2. If seller is direct actor, allow
  if (event.actor_seller_id === props.seller.id) {
    return {
      id: event.id,
      order_history_id: event.order_history_id ?? undefined,
      shopping_mall_escalation_id:
        event.shopping_mall_escalation_id ?? undefined,
      shopping_mall_appeal_id: event.shopping_mall_appeal_id ?? undefined,
      actor_customer_id: event.actor_customer_id ?? undefined,
      actor_seller_id: event.actor_seller_id ?? undefined,
      actor_admin_id: event.actor_admin_id ?? undefined,
      event_type: event.event_type,
      event_status: event.event_status,
      event_comment: event.event_comment ?? undefined,
      created_at: toISOStringSafe(event.created_at),
      deleted_at: event.deleted_at
        ? toISOStringSafe(event.deleted_at)
        : undefined,
    };
  }
  // 3. If related via escalation
  if (event.shopping_mall_escalation_id) {
    const escalation =
      await MyGlobal.prisma.shopping_mall_escalations.findUnique({
        where: { id: event.shopping_mall_escalation_id },
      });
    if (escalation && escalation.initiator_seller_id === props.seller.id) {
      return {
        id: event.id,
        order_history_id: event.order_history_id ?? undefined,
        shopping_mall_escalation_id:
          event.shopping_mall_escalation_id ?? undefined,
        shopping_mall_appeal_id: event.shopping_mall_appeal_id ?? undefined,
        actor_customer_id: event.actor_customer_id ?? undefined,
        actor_seller_id: event.actor_seller_id ?? undefined,
        actor_admin_id: event.actor_admin_id ?? undefined,
        event_type: event.event_type,
        event_status: event.event_status,
        event_comment: event.event_comment ?? undefined,
        created_at: toISOStringSafe(event.created_at),
        deleted_at: event.deleted_at
          ? toISOStringSafe(event.deleted_at)
          : undefined,
      };
    }
  }
  // 4. If related via appeal
  if (event.shopping_mall_appeal_id) {
    const appeal = await MyGlobal.prisma.shopping_mall_appeals.findUnique({
      where: { id: event.shopping_mall_appeal_id },
    });
    if (appeal && appeal.appellant_seller_id === props.seller.id) {
      return {
        id: event.id,
        order_history_id: event.order_history_id ?? undefined,
        shopping_mall_escalation_id:
          event.shopping_mall_escalation_id ?? undefined,
        shopping_mall_appeal_id: event.shopping_mall_appeal_id ?? undefined,
        actor_customer_id: event.actor_customer_id ?? undefined,
        actor_seller_id: event.actor_seller_id ?? undefined,
        actor_admin_id: event.actor_admin_id ?? undefined,
        event_type: event.event_type,
        event_status: event.event_status,
        event_comment: event.event_comment ?? undefined,
        created_at: toISOStringSafe(event.created_at),
        deleted_at: event.deleted_at
          ? toISOStringSafe(event.deleted_at)
          : undefined,
      };
    }
  }
  // 5. If order_history_id exists, try to check seller via order link
  if (event.order_history_id) {
    const orderHistory =
      await MyGlobal.prisma.shopping_mall_order_histories.findUnique({
        where: { id: event.order_history_id },
      });
    if (orderHistory) {
      const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
        where: { id: orderHistory.shopping_mall_order_id },
      });
      if (order && order.shopping_mall_seller_id === props.seller.id) {
        return {
          id: event.id,
          order_history_id: event.order_history_id ?? undefined,
          shopping_mall_escalation_id:
            event.shopping_mall_escalation_id ?? undefined,
          shopping_mall_appeal_id: event.shopping_mall_appeal_id ?? undefined,
          actor_customer_id: event.actor_customer_id ?? undefined,
          actor_seller_id: event.actor_seller_id ?? undefined,
          actor_admin_id: event.actor_admin_id ?? undefined,
          event_type: event.event_type,
          event_status: event.event_status,
          event_comment: event.event_comment ?? undefined,
          created_at: toISOStringSafe(event.created_at),
          deleted_at: event.deleted_at
            ? toISOStringSafe(event.deleted_at)
            : undefined,
        };
      }
    }
  }
  // Not authorized
  throw new HttpException(
    "You do not have access to this customer service event",
    403,
  );
}
