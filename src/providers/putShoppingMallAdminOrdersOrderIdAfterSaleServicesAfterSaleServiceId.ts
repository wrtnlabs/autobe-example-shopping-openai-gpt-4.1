import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderIdAfterSaleServicesAfterSaleServiceId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  afterSaleServiceId: string & tags.Format<"uuid">;
  body: IShoppingMallAfterSaleService.IUpdate;
}): Promise<IShoppingMallAfterSaleService> {
  const allowedStatuses = [
    "requested",
    "processing",
    "approved",
    "denied",
    "in_delivery",
    "completed",
    "cancelled",
  ];

  const record =
    await MyGlobal.prisma.shopping_mall_after_sale_services.findUnique({
      where: { id: props.afterSaleServiceId },
    });
  if (!record || record.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "After-sales service not found for this order",
      404,
    );
  }
  if (record.deleted_at !== null) {
    throw new HttpException("After-sales service has been deleted", 404);
  }
  if (record.status === "completed" || record.status === "cancelled") {
    throw new HttpException(
      "Cannot update a completed or cancelled after-sales service",
      400,
    );
  }
  if (
    props.body.status !== undefined &&
    !allowedStatuses.includes(props.body.status)
  ) {
    throw new HttpException("Status value is not permitted", 400);
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_after_sale_services.update({
      where: { id: props.afterSaleServiceId },
      data: {
        ...(props.body.case_type !== undefined && {
          case_type: props.body.case_type,
        }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.reason !== undefined && { reason: props.body.reason }),
        ...(props.body.evidence_snapshot !== undefined && {
          evidence_snapshot: props.body.evidence_snapshot,
        }),
        ...(props.body.resolution_message !== undefined && {
          resolution_message: props.body.resolution_message,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_delivery_id: updated.shopping_mall_delivery_id ?? undefined,
    case_type: updated.case_type,
    status: updated.status,
    reason: updated.reason ?? undefined,
    evidence_snapshot: updated.evidence_snapshot ?? undefined,
    resolution_message: updated.resolution_message ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
