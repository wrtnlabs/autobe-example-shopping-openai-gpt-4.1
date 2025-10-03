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

export async function getShoppingMallAdminOrdersOrderIdAfterSaleServicesAfterSaleServiceId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  afterSaleServiceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAfterSaleService> {
  const record =
    await MyGlobal.prisma.shopping_mall_after_sale_services.findFirst({
      where: {
        id: props.afterSaleServiceId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_delivery_id: true,
        case_type: true,
        status: true,
        reason: true,
        evidence_snapshot: true,
        resolution_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) {
    throw new HttpException("After-sales service record not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    shopping_mall_delivery_id:
      record.shopping_mall_delivery_id !== null &&
      record.shopping_mall_delivery_id !== undefined
        ? record.shopping_mall_delivery_id
        : undefined,
    case_type: record.case_type,
    status: record.status,
    reason:
      record.reason !== null && record.reason !== undefined
        ? record.reason
        : undefined,
    evidence_snapshot:
      record.evidence_snapshot !== null &&
      record.evidence_snapshot !== undefined
        ? record.evidence_snapshot
        : undefined,
    resolution_message:
      record.resolution_message !== null &&
      record.resolution_message !== undefined
        ? record.resolution_message
        : undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== null && record.deleted_at !== undefined
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
