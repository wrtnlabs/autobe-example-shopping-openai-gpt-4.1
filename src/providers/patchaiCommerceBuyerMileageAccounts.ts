import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import { IPageIAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceMileageAccount";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Paginated and filtered search of mileage accounts for loyalty point balances,
 * by user.
 *
 * This function returns a paginated, filtered list of mileage accounts solely
 * for the authenticated buyer. It strictly enforces that buyers can only view
 * their own mileage accounts by user_id, supports advanced filtering, paging,
 * and default or controlled sorting on safe fields, and omits (soft-deletes)
 * logically removed accounts.
 *
 * @param props - Properties for this request
 * @param props.buyer - The authenticated buyer payload (must match mileage
 *   account user_id for access)
 * @param props.body - Filtering, paging, and sorting criteria. See
 *   IAiCommerceMileageAccount.IRequest.
 * @returns Paginated list of IAiCommerceMileageAccount with correct pagination
 *   info and field conformance.
 * @throws {Error} If authentication is invalid or input types are malformed
 *   (packet validation occurs upstream)
 */
export async function patchaiCommerceBuyerMileageAccounts(props: {
  buyer: BuyerPayload;
  body: IAiCommerceMileageAccount.IRequest;
}): Promise<IPageIAiCommerceMileageAccount> {
  const { buyer, body } = props;

  // Restrict pagination fields to safe minimums
  const page =
    typeof body.page === "number" && body.page >= 1 ? Number(body.page) : 1;
  const limit =
    typeof body.limit === "number" && body.limit >= 1 && body.limit <= 100
      ? Number(body.limit)
      : 20;
  const skip = (page - 1) * limit;

  // Allowed sorting fields
  const allowedSortFields = ["created_at", "balance", "account_code"];
  const sortBy =
    typeof body.sort_by === "string" && allowedSortFields.includes(body.sort_by)
      ? (body.sort_by as "created_at" | "balance" | "account_code")
      : "created_at";
  const sortOrder =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  // Build where clause only using schema fields
  const where = {
    user_id: buyer.id,
    deleted_at: null,
    ...(typeof body.status === "string" && body.status.length > 0
      ? { status: body.status }
      : {}),
    ...(typeof body.account_code === "string" && body.account_code.length > 0
      ? { account_code: { contains: body.account_code } }
      : {}),
    ...(typeof body.min_balance === "number"
      ? { balance: { gte: body.min_balance } }
      : {}),
    ...(typeof body.max_balance === "number"
      ? { balance: { lte: body.max_balance } }
      : {}),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(typeof body.created_from === "string"
              ? { gte: body.created_from }
              : {}),
            ...(typeof body.created_to === "string"
              ? { lte: body.created_to }
              : {}),
          },
        }
      : {}),
    ...(body.updated_from !== undefined || body.updated_to !== undefined
      ? {
          updated_at: {
            ...(typeof body.updated_from === "string"
              ? { gte: body.updated_from }
              : {}),
            ...(typeof body.updated_to === "string"
              ? { lte: body.updated_to }
              : {}),
          },
        }
      : {}),
  };

  // Fetch results and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_mileage_accounts.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_mileage_accounts.count({ where }),
  ]);

  // Map results to strict DTO types with proper date conversion
  const accounts: IAiCommerceMileageAccount[] = rows.map((row) => ({
    id: row.id,
    account_code: row.account_code,
    user_id: row.user_id,
    balance: row.balance,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  // Page calculation (strip tags with Number conversion)
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Number(Math.ceil(total / limit)),
  };

  return {
    pagination,
    data: accounts,
  };
}
