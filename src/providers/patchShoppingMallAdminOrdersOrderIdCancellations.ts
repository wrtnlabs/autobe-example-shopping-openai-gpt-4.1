import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { IPageIShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdCancellations(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderCancellation.IRequest;
}): Promise<IPageIShoppingMallOrderCancellation> {
  const { orderId, body } = props;

  // Base filter: shopping_mall_order_id == orderId, deleted_at IS NULL
  const where = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.reason_code && { reason_code: body.reason_code }),
    ...(body.explanation && { explanation: body.explanation }),
  };

  // Fetch cancellations for the order (all, as pagination not specified)
  const cancellations =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findMany({
      where,
      orderBy: { created_at: "desc" },
    });
  const total = cancellations.length;

  return {
    pagination: {
      current: 0,
      limit: total,
      records: total,
      pages: 1,
    },
    data: cancellations.map((cancellation) => ({
      id: cancellation.id,
      shopping_mall_order_id: cancellation.shopping_mall_order_id,
      initiator_customer_id: cancellation.initiator_customer_id ?? undefined,
      initiator_seller_id: cancellation.initiator_seller_id ?? undefined,
      initiator_admin_id: cancellation.initiator_admin_id ?? undefined,
      reason_code: cancellation.reason_code,
      status: cancellation.status,
      explanation: cancellation.explanation ?? undefined,
      requested_at: toISOStringSafe(cancellation.requested_at),
      resolved_at: cancellation.resolved_at
        ? toISOStringSafe(cancellation.resolved_at)
        : undefined,
      created_at: toISOStringSafe(cancellation.created_at),
      updated_at: toISOStringSafe(cancellation.updated_at),
    })),
  };
}
