import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderIdAfterSaleServicesAfterSaleServiceId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  afterSaleServiceId: string & tags.Format<"uuid">;
  body: IShoppingMallAfterSaleService.IUpdate;
}): Promise<IShoppingMallAfterSaleService> {
  const { customer, orderId, afterSaleServiceId, body } = props;

  const afterSale =
    await MyGlobal.prisma.shopping_mall_after_sale_services.findFirst({
      where: {
        id: afterSaleServiceId,
        shopping_mall_order_id: orderId,
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

  if (!afterSale) {
    throw new HttpException("After-sales service not found", 404);
  }

  // Authorization: check order belongs to requesting customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (!order) {
    throw new HttpException(
      "Unauthorized to update after-sales service for this order",
      403,
    );
  }

  // Check status of after-sales - allow updates only if not finalized
  const finalizedStatuses = ["approved", "denied", "completed", "cancelled"];
  if (finalizedStatuses.includes(afterSale.status)) {
    throw new HttpException("Cannot edit finalized after-sales service", 403);
  }

  // Prepare updated_at
  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.shopping_mall_after_sale_services.update({
      where: { id: afterSale.id },
      data: {
        // Only update allowed fields if they were supplied
        case_type: body.case_type ?? undefined,
        status: body.status ?? undefined,
        reason: body.reason ?? undefined,
        evidence_snapshot: body.evidence_snapshot ?? undefined,
        resolution_message: body.resolution_message ?? undefined,
        updated_at: now,
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

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_delivery_id: updated.shopping_mall_delivery_id ?? null,
    case_type: updated.case_type,
    status: updated.status,
    reason: updated.reason ?? null,
    evidence_snapshot: updated.evidence_snapshot ?? null,
    resolution_message: updated.resolution_message ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
