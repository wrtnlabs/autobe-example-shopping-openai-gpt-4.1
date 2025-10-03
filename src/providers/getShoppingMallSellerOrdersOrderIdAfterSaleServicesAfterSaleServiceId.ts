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

export async function getShoppingMallSellerOrdersOrderIdAfterSaleServicesAfterSaleServiceId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  afterSaleServiceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAfterSaleService> {
  const afterSale =
    await MyGlobal.prisma.shopping_mall_after_sale_services.findFirst({
      where: {
        id: props.afterSaleServiceId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
    });
  if (!afterSale) {
    throw new HttpException(
      "After-sales service record not found or has been deleted.",
      404,
    );
  }
  // Confirm seller owns at least one order item in the order
  const ownsOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_order_id: props.orderId,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!ownsOrderItem) {
    throw new HttpException(
      "You do not have permission to view this after-sales case.",
      403,
    );
  }
  return {
    id: afterSale.id,
    shopping_mall_order_id: afterSale.shopping_mall_order_id,
    shopping_mall_delivery_id:
      afterSale.shopping_mall_delivery_id !== undefined
        ? afterSale.shopping_mall_delivery_id
        : undefined,
    case_type: afterSale.case_type,
    status: afterSale.status,
    reason: afterSale.reason !== undefined ? afterSale.reason : undefined,
    evidence_snapshot:
      afterSale.evidence_snapshot !== undefined
        ? afterSale.evidence_snapshot
        : undefined,
    resolution_message:
      afterSale.resolution_message !== undefined
        ? afterSale.resolution_message
        : undefined,
    created_at: toISOStringSafe(afterSale.created_at),
    updated_at: toISOStringSafe(afterSale.updated_at),
    deleted_at:
      afterSale.deleted_at !== null && afterSale.deleted_at !== undefined
        ? toISOStringSafe(afterSale.deleted_at)
        : afterSale.deleted_at === null
          ? null
          : undefined,
  };
}
