import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerServiceEvent";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCustomerServiceEventsEventId(props: {
  customer: CustomerPayload;
  eventId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerServiceEvent> {
  // Fetch the event by ID and ensure not soft-deleted
  const event =
    await MyGlobal.prisma.shopping_mall_customer_service_events.findUnique({
      where: { id: props.eventId },
    });
  if (!event || event.deleted_at !== null) {
    throw new HttpException("Customer service event not found", 404);
  }
  // AuthZ: Only allow customers to access their own events
  if (event.actor_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Access denied to this customer service event",
      403,
    );
  }
  return {
    id: event.id,
    order_history_id: event.order_history_id ?? undefined,
    shopping_mall_escalation_id: event.shopping_mall_escalation_id ?? undefined,
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
