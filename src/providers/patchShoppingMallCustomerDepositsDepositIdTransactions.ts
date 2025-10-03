import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";
import { IPageIShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDepositTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerDepositsDepositIdTransactions(props: {
  customer: CustomerPayload;
  depositId: string & tags.Format<"uuid">;
  body: IShoppingMallDepositTransaction.IRequest;
}): Promise<IPageIShoppingMallDepositTransaction> {
  // 1. Confirm the deposit account belongs to requesting customer and is not deleted
  const deposit = await MyGlobal.prisma.shopping_mall_deposits.findFirst({
    where: {
      id: props.depositId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!deposit) {
    throw new HttpException(
      "Forbidden: Deposit not found or access denied",
      403,
    );
  }
  // 2. Build WHERE filter
  const where: Record<string, unknown> = {
    shopping_mall_deposit_id: props.depositId,
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.business_status !== undefined && {
      business_status: props.body.business_status,
    }),
    ...(props.body.type !== undefined && { type: props.body.type }),
    ...(props.body.order_id !== undefined && {
      shopping_mall_order_id: props.body.order_id,
    }),
    ...(props.body.reason !== undefined &&
      props.body.reason !== null && {
        reason: { contains: props.body.reason },
      }),
    ...((props.body.start_date !== undefined &&
      props.body.start_date !== null) ||
    (props.body.end_date !== undefined && props.body.end_date !== null)
      ? {
          created_at: {
            ...(props.body.start_date !== undefined &&
              props.body.start_date !== null && { gte: props.body.start_date }),
            ...(props.body.end_date !== undefined &&
              props.body.end_date !== null && { lt: props.body.end_date }),
          },
        }
      : {}),
  };
  // 3. Pagination and sort
  const currentPage = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (currentPage - 1) * limit;
  const sort =
    props.body.sort === "created_at:asc"
      ? { created_at: "asc" as Prisma.SortOrder }
      : { created_at: "desc" as Prisma.SortOrder };
  // 4. Query and total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_deposit_transactions.findMany({
      where: where,
      orderBy: sort,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_deposit_transactions.count({ where: where }),
  ]);
  // 5. Map to DTO
  const data: IShoppingMallDepositTransaction[] = rows.map((row) => ({
    id: row.id,
    shopping_mall_deposit_id: row.shopping_mall_deposit_id,
    shopping_mall_customer_id: row.shopping_mall_customer_id,
    shopping_mall_order_id: row.shopping_mall_order_id ?? undefined,
    type: row.type,
    amount: row.amount,
    business_status: row.business_status,
    reason: row.reason ?? undefined,
    evidence_reference: row.evidence_reference ?? undefined,
    reversed_at: row.reversed_at ? toISOStringSafe(row.reversed_at) : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));
  return {
    pagination: {
      current: Number(currentPage),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data,
  };
}
