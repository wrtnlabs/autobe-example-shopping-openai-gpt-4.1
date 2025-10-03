import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";
import { IPageIShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMileageTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerMileagesMileageIdTransactions(props: {
  customer: CustomerPayload;
  mileageId: string & tags.Format<"uuid">;
  body: IShoppingMallMileageTransaction.IRequest;
}): Promise<IPageIShoppingMallMileageTransaction> {
  const { customer, mileageId, body } = props;

  // 1. Authorization: Verify that the mileage account belongs to this customer
  const mileage = await MyGlobal.prisma.shopping_mall_mileages.findUnique({
    where: { id: mileageId },
    select: { shopping_mall_customer_id: true },
  });
  if (!mileage || mileage.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Not found or forbidden", 404);
  }

  // 2. Construct where clause for filtering
  const where = {
    shopping_mall_mileage_id: mileageId,
    shopping_mall_customer_id: customer.id,
    ...(body.type !== undefined && body.type !== null
      ? { type: body.type }
      : {}),
    ...(body.business_status !== undefined && body.business_status !== null
      ? { business_status: body.business_status }
      : {}),
    ...(body.reason !== undefined && body.reason !== null
      ? { reason: { contains: body.reason } }
      : {}),
    ...(body.shopping_mall_order_id !== undefined &&
    body.shopping_mall_order_id !== null
      ? { shopping_mall_order_id: body.shopping_mall_order_id }
      : {}),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined && body.created_from !== null
              ? { gte: body.created_from }
              : {}),
            ...(body.created_to !== undefined && body.created_to !== null
              ? { lte: body.created_to }
              : {}),
          },
        }
      : {}),
  };

  // 3. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 4. Sort: limit to allowed fields
  const allowedSortFields = ["created_at", "amount", "type"];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by as string)
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // 5. Query data + total concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_mileage_transactions.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_mileage_transactions.count({ where }),
  ]);

  // 6. Map to API response
  const data = rows.map((t) => {
    const base = {
      id: t.id,
      shopping_mall_mileage_id: t.shopping_mall_mileage_id,
      shopping_mall_customer_id: t.shopping_mall_customer_id,
      type: t.type,
      amount: t.amount,
      business_status: t.business_status,
      created_at: toISOStringSafe(t.created_at),
      updated_at: toISOStringSafe(t.updated_at),
    };
    return {
      ...base,
      shopping_mall_order_id:
        t.shopping_mall_order_id !== undefined &&
        t.shopping_mall_order_id !== null
          ? t.shopping_mall_order_id
          : undefined,
      reason:
        t.reason !== undefined && t.reason !== null ? t.reason : undefined,
      evidence_reference:
        t.evidence_reference !== undefined && t.evidence_reference !== null
          ? t.evidence_reference
          : undefined,
      reversed_at:
        t.reversed_at !== undefined && t.reversed_at !== null
          ? toISOStringSafe(t.reversed_at)
          : undefined,
      deleted_at:
        t.deleted_at !== undefined && t.deleted_at !== null
          ? toISOStringSafe(t.deleted_at)
          : undefined,
    };
  });

  // 7. Pagination response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
