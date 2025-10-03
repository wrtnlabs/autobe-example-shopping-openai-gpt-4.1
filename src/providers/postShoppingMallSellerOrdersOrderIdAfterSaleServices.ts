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

export async function postShoppingMallSellerOrdersOrderIdAfterSaleServices(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAfterSaleService.ICreate;
}): Promise<IShoppingMallAfterSaleService> {
  // 1. Fetch the order. Must exist and not be soft-deleted.
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, deleted_at: true },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Ensure this seller owns at least one item in the order.
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      shopping_mall_order_id: props.orderId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!item) {
    throw new HttpException(
      "Forbidden: You do not have access to this order",
      403,
    );
  }

  // 3. Create the after-sale service record.
  const now = toISOStringSafe(new Date());
  const afterSale =
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

  // 4. Format output matching API contract (handle null/undefined)
  return {
    id: afterSale.id,
    shopping_mall_order_id: afterSale.shopping_mall_order_id,
    shopping_mall_delivery_id: afterSale.shopping_mall_delivery_id ?? undefined,
    case_type: afterSale.case_type,
    status: afterSale.status,
    reason: afterSale.reason ?? undefined,
    evidence_snapshot: afterSale.evidence_snapshot ?? undefined,
    resolution_message: afterSale.resolution_message ?? undefined,
    created_at: toISOStringSafe(afterSale.created_at),
    updated_at: toISOStringSafe(afterSale.updated_at),
    deleted_at:
      afterSale.deleted_at !== null && afterSale.deleted_at !== undefined
        ? toISOStringSafe(afterSale.deleted_at)
        : undefined,
  };
}
