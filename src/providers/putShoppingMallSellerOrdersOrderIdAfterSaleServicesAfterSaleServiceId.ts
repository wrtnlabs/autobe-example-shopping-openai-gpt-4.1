import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerOrdersOrderIdAfterSaleServicesAfterSaleServiceId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  afterSaleServiceId: string & tags.Format<"uuid">;
  body: IShoppingMallAfterSaleService.IUpdate;
}): Promise<IShoppingMallAfterSaleService> {
  // 1. Fetch after-sale service for the given order and after sale service id
  const service =
    await MyGlobal.prisma.shopping_mall_after_sale_services.findUnique({
      where: { id: props.afterSaleServiceId },
    });
  if (!service || service.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("After-sale service not found", 404);
  }

  // 2. Authorization: ensure this seller is associated with at least one order item for this order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      shopping_mall_order_id: props.orderId,
      shopping_mall_seller_id: props.seller.id,
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "You are not authorized to update this after-sale service",
      403,
    );
  }

  // 3. Optional: Add status transition business rules if needed (minimal for now)

  // 4. Update (only allowed fields, updated_at always) - do not allow setting fields not in DTO
  const updated =
    await MyGlobal.prisma.shopping_mall_after_sale_services.update({
      where: { id: props.afterSaleServiceId },
      data: {
        case_type: props.body.case_type ?? undefined,
        status: props.body.status ?? undefined,
        reason: props.body.reason ?? undefined,
        evidence_snapshot: props.body.evidence_snapshot ?? undefined,
        resolution_message: props.body.resolution_message ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // 5. Return mapped to IShoppingMallAfterSaleService (proper required/null/undefined handling)
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
