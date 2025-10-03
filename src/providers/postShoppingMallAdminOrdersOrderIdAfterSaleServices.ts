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

export async function postShoppingMallAdminOrdersOrderIdAfterSaleServices(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAfterSaleService.ICreate;
}): Promise<IShoppingMallAfterSaleService> {
  // Check order exists for the given orderId
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (order == null) {
    throw new HttpException("Order not found", 404);
  }

  // Prepare creation metadata
  const now = toISOStringSafe(new Date());

  // Insert after-sale service record
  const created =
    await MyGlobal.prisma.shopping_mall_after_sale_services.create({
      data: {
        id: v4(),
        shopping_mall_order_id: props.orderId,
        shopping_mall_delivery_id: props.body.shopping_mall_delivery_id ?? null,
        case_type: props.body.case_type,
        status: "requested",
        reason: props.body.reason ?? null,
        evidence_snapshot: props.body.evidence_snapshot ?? null,
        resolution_message: props.body.resolution_message ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_delivery_id: created.shopping_mall_delivery_id ?? null,
    case_type: created.case_type,
    status: created.status,
    reason: created.reason ?? null,
    evidence_snapshot: created.evidence_snapshot ?? null,
    resolution_message: created.resolution_message ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
