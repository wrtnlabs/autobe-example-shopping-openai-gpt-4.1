import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerServiceEvent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminCustomerServiceEventsEventId(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerServiceEvent.IUpdate;
}): Promise<IShoppingMallCustomerServiceEvent> {
  const { admin, eventId, body } = props;

  // Find event, ensure it exists
  const orig =
    await MyGlobal.prisma.shopping_mall_customer_service_events.findUniqueOrThrow(
      {
        where: { id: eventId },
      },
    );

  // Only permitted fields can be modified
  const updated =
    await MyGlobal.prisma.shopping_mall_customer_service_events.update({
      where: { id: eventId },
      data: {
        event_status: body.event_status,
        event_comment:
          typeof body.event_comment !== "undefined" ? body.event_comment : null,
      },
    });

  return {
    id: updated.id,
    order_history_id:
      updated.order_history_id !== null ? updated.order_history_id : undefined,
    shopping_mall_escalation_id:
      updated.shopping_mall_escalation_id !== null
        ? updated.shopping_mall_escalation_id
        : undefined,
    shopping_mall_appeal_id:
      updated.shopping_mall_appeal_id !== null
        ? updated.shopping_mall_appeal_id
        : undefined,
    actor_customer_id:
      updated.actor_customer_id !== null
        ? updated.actor_customer_id
        : undefined,
    actor_seller_id:
      updated.actor_seller_id !== null ? updated.actor_seller_id : undefined,
    actor_admin_id:
      updated.actor_admin_id !== null ? updated.actor_admin_id : undefined,
    event_type: updated.event_type,
    event_status: updated.event_status,
    event_comment:
      typeof updated.event_comment !== "undefined" &&
      updated.event_comment !== null
        ? updated.event_comment
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
