import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePayment";
import { IPageIAiCommercePayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommercePayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and search payment records with advanced filtering and pagination from
 * the ai_commerce_payments table.
 *
 * Retrieves a paginated, filterable list of payment records from the
 * ai_commerce_payments table. This endpoint enables admins to search by status,
 * currency, date range, or amount for financial analytics and troubleshooting.
 * Fields are fully type-safe and all dates represented as string &
 * tags.Format<'date-time'>.
 *
 * @param props - Admin auth and search/pagination request.
 * @param props.admin - The authenticated admin user making the request.
 * @param props.body - Filtering and pagination criteria for searching payments.
 * @returns Paginated list of IAiCommercePayment matching the provided filters.
 * @throws {Error} When authentication fails or on database error.
 */
export async function patchaiCommerceAdminPayments(props: {
  admin: AdminPayload;
  body: IAiCommercePayment.IRequest;
}): Promise<IPageIAiCommercePayment> {
  const { admin, body } = props;

  // Pagination defaults and arithmetic (normalize for typia tags)
  const page = body.page ?? (1 as number);
  const limit = body.limit ?? (20 as number);
  const skip = Number(page - 1) * Number(limit);

  // Compose amount range filter
  let amountFilter: { gte?: number; lte?: number } | undefined;
  if (body.minAmount != null || body.maxAmount != null) {
    amountFilter = {
      ...(body.minAmount != null ? { gte: body.minAmount } : {}),
      ...(body.maxAmount != null ? { lte: body.maxAmount } : {}),
    };
  }

  // Compose issued_at date range filter
  let issuedAtFilter: { gte?: string; lte?: string } | undefined;
  if (body.fromDate != null || body.toDate != null) {
    issuedAtFilter = {
      ...(body.fromDate != null ? { gte: body.fromDate } : {}),
      ...(body.toDate != null ? { lte: body.toDate } : {}),
    };
  }

  // Compose where clause using only allowed fields.
  const where = {
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.currencyCode !== undefined &&
      body.currencyCode !== null && { currency_code: body.currencyCode }),
    ...(amountFilter ? { amount: amountFilter } : {}),
    ...(issuedAtFilter ? { issued_at: issuedAtFilter } : {}),
  };

  // Query paginated data and total records count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_payments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.ai_commerce_payments.count({ where }),
  ]);

  // Map rows to IAiCommercePayment, converting all dates accurately
  const data: IAiCommercePayment[] = rows.map((record) => {
    const output: IAiCommercePayment = {
      id: record.id,
      payment_reference: record.payment_reference,
      status: record.status,
      amount: record.amount,
      currency_code: record.currency_code,
      issued_at: toISOStringSafe(record.issued_at),
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    };
    // Optional fields
    if (record.confirmed_at !== undefined && record.confirmed_at !== null)
      output.confirmed_at = toISOStringSafe(record.confirmed_at);
    if (record.failure_reason !== undefined)
      output.failure_reason = record.failure_reason;
    if (record.deleted_at !== undefined && record.deleted_at !== null)
      output.deleted_at = toISOStringSafe(record.deleted_at);
    return output;
  });

  // Construct pagination output, stripping typia brand where necessary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
