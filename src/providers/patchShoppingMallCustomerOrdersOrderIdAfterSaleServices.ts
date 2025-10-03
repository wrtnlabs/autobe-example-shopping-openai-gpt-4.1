import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import { IPageIShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAfterSaleService";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdAfterSaleServices(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAfterSaleService.IRequest;
}): Promise<IPageIShoppingMallAfterSaleService.ISummary> {
  const { customer, orderId, body } = props;

  // Step 1: Verify order exists and belongs to customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) throw new HttpException("Order not found or not accessible", 404);

  // Step 2: Build where filter for after-sale services
  const where = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.case_type !== undefined &&
      body.case_type !== null && { case_type: body.case_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.reason !== undefined &&
      body.reason !== null && { reason: { contains: body.reason } }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Step 3: Pagination parameters
  const page = body.page !== undefined && body.page !== null ? body.page : 1;
  const limit =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Step 4: Query paginated data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_after_sale_services.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_after_sale_services.count({ where }),
  ]);

  // Step 5: Map results to ISummary
  const data = rows.map((svc) => ({
    id: svc.id,
    order_id: svc.shopping_mall_order_id,
    delivery_id: svc.shopping_mall_delivery_id ?? undefined,
    case_type: svc.case_type,
    status: svc.status,
    reason: svc.reason ?? undefined,
    evidence_snapshot: svc.evidence_snapshot ?? undefined,
    resolution_message: svc.resolution_message ?? undefined,
    created_at: toISOStringSafe(svc.created_at),
    updated_at: toISOStringSafe(svc.updated_at),
    deleted_at: svc.deleted_at ? toISOStringSafe(svc.deleted_at) : undefined,
  }));

  // Step 6: Return paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
