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

export async function putShoppingMallSellerCustomerServiceEventsEventId(props: {
  seller: SellerPayload;
  eventId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerServiceEvent.IUpdate;
}): Promise<IShoppingMallCustomerServiceEvent> {
  // 1. Fetch event, verify it exists and is not deleted
  const event =
    await MyGlobal.prisma.shopping_mall_customer_service_events.findUnique({
      where: { id: props.eventId },
    });
  if (!event || event.deleted_at !== null) {
    throw new HttpException("Event not found", 404);
  }

  // 2. Verify seller is authorized to update this event
  if (event.actor_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: Only the assigned seller can update this event",
      403,
    );
  }

  // 3. Perform the update
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_customer_service_events.update({
      where: { id: props.eventId },
      data: {
        event_status: props.body.event_status,
        event_comment: props.body.event_comment ?? null,
        // updated_at cannot be set directly here
      },
    });

  // 4. Return as IShoppingMallCustomerServiceEvent (null/undefined/type conversions handled)
  return {
    id: updated.id,
    order_history_id: updated.order_history_id ?? undefined,
    shopping_mall_escalation_id:
      updated.shopping_mall_escalation_id ?? undefined,
    shopping_mall_appeal_id: updated.shopping_mall_appeal_id ?? undefined,
    actor_customer_id: updated.actor_customer_id ?? undefined,
    actor_seller_id: updated.actor_seller_id ?? undefined,
    actor_admin_id: updated.actor_admin_id ?? undefined,
    event_type: updated.event_type,
    event_status: updated.event_status,
    event_comment: updated.event_comment ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
