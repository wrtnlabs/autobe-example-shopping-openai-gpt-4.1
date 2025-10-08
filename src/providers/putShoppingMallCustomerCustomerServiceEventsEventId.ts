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

export async function putShoppingMallCustomerCustomerServiceEventsEventId(props: {
  customer: CustomerPayload;
  eventId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerServiceEvent.IUpdate;
}): Promise<IShoppingMallCustomerServiceEvent> {
  const event =
    await MyGlobal.prisma.shopping_mall_customer_service_events.findFirst({
      where: {
        id: props.eventId,
        deleted_at: null,
        actor_customer_id: props.customer.id,
      },
    });
  if (!event) {
    throw new HttpException(
      "해당 이벤트가 존재하지 않거나 권한이 없습니다.",
      404,
    );
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_customer_service_events.update({
      where: { id: props.eventId },
      data: {
        event_status: props.body.event_status,
        event_comment: props.body.event_comment ?? null,
      },
    });
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
