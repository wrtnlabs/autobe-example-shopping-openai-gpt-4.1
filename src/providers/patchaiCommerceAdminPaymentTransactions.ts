import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentTransaction";
import { IPageIAiCommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommercePaymentTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a paginated, filterable list of payment transactions for admin
 * investigation.
 *
 * Allows admin users to search and filter payment transactions from the
 * ai_commerce_payment_transactions table, with advanced filtering on status,
 * amount, gateway, date/time, and more, and complete pagination/sorting
 * support. Enforces admin-only access, does not expose sensitive fields. All
 * date values are formatted as string & tags.Format<'date-time'>. Pagination is
 * strict and consistent with IPage.
 *
 * @param props - The operation props.
 * @param props.admin - Authenticated admin context (authorization enforced).
 * @param props.body - Search and filter parameters for the payment
 *   transactions.
 * @returns Paginated set of payment transaction records matching the
 *   filter/query.
 * @throws {Error} If database failure, unauthorized, or validation error
 *   occurs.
 */
export async function patchaiCommerceAdminPaymentTransactions(props: {
  admin: AdminPayload;
  body: IAiCommercePaymentTransaction.IRequest;
}): Promise<IPageIAiCommercePaymentTransaction> {
  const {
    transaction_reference,
    payment_id,
    status,
    method_id,
    gateway_id,
    requested_at_from,
    requested_at_to,
    amount_min,
    amount_max,
    currency_code,
    page,
    limit,
    sort,
    order,
  } = props.body;

  const take: number = limit !== undefined ? Number(limit) : 20;
  const currentPage: number = page !== undefined ? Number(page) : 1;
  const skip: number = (currentPage - 1) * take;

  // Compose where
  const where: Record<string, any> = {
    ...(transaction_reference !== undefined &&
      transaction_reference.length > 0 && {
        transaction_reference: { contains: transaction_reference },
      }),
    ...(payment_id !== undefined && {
      payment_id,
    }),
    ...(status !== undefined && { status }),
    ...(method_id !== undefined && { method_id }),
    ...(gateway_id !== undefined && { gateway_id }),
    ...(currency_code !== undefined && { currency_code }),
    ...(requested_at_from !== undefined || requested_at_to !== undefined
      ? {
          requested_at: {
            ...(requested_at_from !== undefined && { gte: requested_at_from }),
            ...(requested_at_to !== undefined && { lte: requested_at_to }),
          },
        }
      : {}),
    ...(amount_min !== undefined || amount_max !== undefined
      ? {
          amount: {
            ...(amount_min !== undefined && { gte: amount_min }),
            ...(amount_max !== undefined && { lte: amount_max }),
          },
        }
      : {}),
  };

  // Sort by allowed fields only
  const allowedSort = ["requested_at", "amount", "status"];
  let orderBy: Record<string, any>;
  if (sort && allowedSort.includes(sort)) {
    orderBy = { [sort]: order === "asc" ? "asc" : "desc" };
  } else {
    orderBy = { requested_at: "desc" };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_payment_transactions.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.ai_commerce_payment_transactions.count({ where }),
  ]);

  const data: IAiCommercePaymentTransaction[] = rows.map((row) => {
    return {
      id: row.id,
      payment_id: row.payment_id,
      method_id: row.method_id,
      gateway_id: row.gateway_id,
      transaction_reference: row.transaction_reference,
      status: row.status,
      amount: row.amount,
      currency_code: row.currency_code,
      requested_at: toISOStringSafe(row.requested_at),
      completed_at:
        row.completed_at !== null && row.completed_at !== undefined
          ? toISOStringSafe(row.completed_at)
          : null,
      gateway_payload:
        row.gateway_payload !== undefined
          ? (row.gateway_payload ?? null)
          : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : null,
    };
  });

  const pagination: IPageIAiCommercePaymentTransaction["pagination"] = {
    current: Number(currentPage),
    limit: Number(take),
    records: Number(total),
    pages: Number(Math.ceil(total / take)),
  };

  return {
    pagination,
    data,
  };
}
