import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositAccount";
import { IPageIAiCommerceDepositAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceDepositAccount";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin-restricted query for paginated, filterable list of deposit accounts
 *
 * Fetches a paginated set of user deposit account records, with optional
 * filtering by user_id, status, or currency_code. Supports sorting and robust
 * pagination. Only accessible by authenticated admins.
 *
 * @param props - Input parameter object
 * @param props.admin - Authenticated admin payload (required; validated by
 *   decorator)
 * @param props.body - Search/filter criteria conforming to
 *   IAiCommerceDepositAccount.IRequest
 * @returns Paginated list of deposit accounts with pagination info
 * @throws {Error} If any database error occurs or admin is not authenticated
 */
export async function patchaiCommerceAdminDepositAccounts(props: {
  admin: AdminPayload;
  body: IAiCommerceDepositAccount.IRequest;
}): Promise<IPageIAiCommerceDepositAccount> {
  // Extract pagination safely (1-based page, default 1; limit default 20, max 100)
  const pageRaw = props.body.page ?? 1;
  const limitRaw = props.body.limit ?? 20;
  const page = typeof pageRaw === "number" && pageRaw >= 1 ? pageRaw : 1;
  const limit =
    typeof limitRaw === "number" && limitRaw >= 1 && limitRaw <= 100
      ? limitRaw
      : 20;
  const offset = (page - 1) * limit;

  // Allowed sort fields and default
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "balance",
    "status",
    "account_code",
    "currency_code",
  ];
  let sortField = "created_at";
  let sortDir: "asc" | "desc" = "desc";
  if (props.body.sort) {
    const parts = props.body.sort.trim().split(/\s+/);
    if (parts.length === 2 && allowedSortFields.includes(parts[0])) {
      sortField = parts[0];
      sortDir = parts[1] === "asc" ? "asc" : "desc";
    }
  }

  // Build the query filter
  const prismaWhere = {
    deleted_at: null,
    ...(props.body.user_id !== undefined && props.body.user_id !== null
      ? { user_id: props.body.user_id }
      : {}),
    ...(props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {}),
    ...(props.body.currency_code !== undefined &&
    props.body.currency_code !== null
      ? { currency_code: props.body.currency_code }
      : {}),
  };

  // Fetch paginated account rows and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_deposit_accounts.findMany({
      where: prismaWhere,
      orderBy: { [sortField]: sortDir },
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_deposit_accounts.count({ where: prismaWhere }),
  ]);

  // Map to output DTO, with all dates converted and optional fields type-correct
  const data = rows.map((row) => {
    const output: IAiCommerceDepositAccount = {
      id: row.id,
      account_code: row.account_code,
      user_id: row.user_id,
      balance: row.balance,
      currency_code: row.currency_code,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
    // Only include deleted_at if present (per DTO: optional, null|undefined if not set)
    if (row.deleted_at !== undefined && row.deleted_at !== null) {
      output.deleted_at = toISOStringSafe(row.deleted_at);
    }
    return output;
  });

  // Pagination meta
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 0,
  };

  return {
    pagination,
    data,
  };
}
