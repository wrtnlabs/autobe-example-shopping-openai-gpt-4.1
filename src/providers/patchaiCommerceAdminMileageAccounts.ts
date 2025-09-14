import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import { IPageIAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceMileageAccount";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated and filtered search of mileage accounts for loyalty point balances,
 * by user or admin.
 *
 * Retrieve a paginated, filtered list of mileage accounts associated with users
 * from ai_commerce_mileage_accounts. Query parameters include user ID, account
 * status, creation/update date range, and balance filters. The endpoint
 * supports advanced analytics actions for admins and lets authenticated users
 * review their own loyalty balances, with field masking and row-level
 * permissions according to role. Security is strictly enforced: only users may
 * access their own mileage accounts; admins have unrestricted analytics access.
 * All search criteria and results are auditable, and access is logged for
 * fraud/compliance review.
 *
 * Use cases include loyalty point review, reward analytics, and admin
 * audit/compliance activities.
 *
 * @param props - The props object.
 * @param props.admin - The authenticated AdminPayload performing the operation.
 *   Must be an active, valid admin.
 * @param props.body - Filtering, sorting, and pagination controls for search.
 * @returns Paginated results: mileage account summaries and details.
 * @throws {Error} If database errors occur.
 */
export async function patchaiCommerceAdminMileageAccounts(props: {
  admin: AdminPayload;
  body: IAiCommerceMileageAccount.IRequest;
}): Promise<IPageIAiCommerceMileageAccount> {
  const {
    user_id,
    status,
    account_code,
    min_balance,
    max_balance,
    created_from,
    created_to,
    updated_from,
    updated_to,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body ?? {};

  // Pagination: default page 1, limit 20 (max 100)
  const pageNum = page ?? 1;
  const limitNum = limit ?? 20;
  const cappedLimit = limitNum > 100 ? 100 : limitNum;
  const skip = (pageNum - 1) * cappedLimit;

  // Allowed sort fields
  const allowedSort: ReadonlyArray<string> = [
    "created_at",
    "balance",
    "account_code",
    "status",
    "updated_at",
  ];
  const sortField = allowedSort.includes(sort_by ?? "")
    ? (sort_by ?? "created_at")
    : "created_at";
  const sortDir = sort_order === "asc" ? "asc" : "desc";

  // Build where object with all filters (use only allowed fields, always filter deleted_at: null)
  // All date, id, numeric types - strip null/undefined for required non-nullable fields
  const balanceFilter =
    min_balance !== undefined && max_balance !== undefined
      ? { gte: min_balance, lte: max_balance }
      : min_balance !== undefined
        ? { gte: min_balance }
        : max_balance !== undefined
          ? { lte: max_balance }
          : undefined;
  const createdAtFilter =
    created_from !== undefined && created_to !== undefined
      ? { gte: created_from, lte: created_to }
      : created_from !== undefined
        ? { gte: created_from }
        : created_to !== undefined
          ? { lte: created_to }
          : undefined;
  const updatedAtFilter =
    updated_from !== undefined && updated_to !== undefined
      ? { gte: updated_from, lte: updated_to }
      : updated_from !== undefined
        ? { gte: updated_from }
        : updated_to !== undefined
          ? { lte: updated_to }
          : undefined;

  const where = {
    deleted_at: null,
    ...(user_id !== undefined && user_id !== null && { user_id }),
    ...(status !== undefined && status !== null && { status }),
    ...(account_code !== undefined &&
      account_code !== null &&
      account_code.length > 0 && {
        account_code: { contains: account_code },
      }),
    ...(balanceFilter !== undefined && { balance: balanceFilter }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(updatedAtFilter !== undefined && { updated_at: updatedAtFilter }),
  };

  // Query active accounts with filters/paging
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_mileage_accounts.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip,
      take: cappedLimit,
    }),
    MyGlobal.prisma.ai_commerce_mileage_accounts.count({ where }),
  ]);

  // Map to DTO (handle Date→string), deleted_at is nullable/optional
  const data = rows.map((r) => {
    const result: IAiCommerceMileageAccount = {
      id: r.id,
      account_code: r.account_code,
      user_id: r.user_id,
      balance: r.balance,
      status: r.status,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    };
    // deleted_at is (string & tags.Format<'date-time'>) | null | undefined
    if (r.deleted_at !== undefined && r.deleted_at !== null) {
      result.deleted_at = toISOStringSafe(r.deleted_at);
    }
    return result;
  });

  // Pagination structure (must strip brand types for pagination fields)
  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(cappedLimit),
      records: total,
      pages: Math.ceil(total / cappedLimit),
    },
    data,
  };
}
