import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";
import { IPageIShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendDeposit";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search, filter, and paginate deposit ledger balances.
 *
 * Enables administrators and business operators to perform advanced search,
 * filtering, and retrieval of deposit (cash balance) ledgers for customers or
 * sellers. Results are paginated, and only non-deleted ledgers are returned.
 * Strict admin authentication is enforced for compliance and audit.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin operator requesting deposit
 *   ledger data
 * @param props.body - Filter and pagination parameters (optional)
 * @returns Paginated summary list of deposit ledgers matching the provided
 *   filters
 * @throws {Error} When no admin authentication is present, or if any internal
 *   error occurs
 */
export async function patch__shoppingMallAiBackend_admin_deposits(props: {
  admin: { id: string & tags.Format<"uuid">; type: "admin" };
  body: IShoppingMallAiBackendDeposit.IRequest;
}): Promise<IPageIShoppingMallAiBackendDeposit.ISummary> {
  const { admin, body } = props;
  if (!admin) throw new Error("Unauthorized: admin required");

  // Defaults for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Build the Prisma where clause dynamically
  const where = {
    deleted_at: null,
    ...(body.customer_id !== undefined &&
      body.customer_id !== null && {
        shopping_mall_ai_backend_customer_id: body.customer_id,
      }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        shopping_mall_ai_backend_seller_id: body.seller_id,
      }),
    // Usable balance range (gte/lte/gte+lte)
    ...((body.min_usable_balance !== undefined &&
      body.min_usable_balance !== null) ||
    (body.max_usable_balance !== undefined && body.max_usable_balance !== null)
      ? {
          usable_balance: {
            ...(body.min_usable_balance !== undefined &&
              body.min_usable_balance !== null && {
                gte: body.min_usable_balance,
              }),
            ...(body.max_usable_balance !== undefined &&
              body.max_usable_balance !== null && {
                lte: body.max_usable_balance,
              }),
          },
        }
      : {}),
    // Created date range (gte/lte/gte+lte)
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
  };

  const skip = (page - 1) * limit;
  const take = limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_deposits.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_deposits.count({ where }),
  ]);

  const data = rows.map((deposit) => ({
    id: deposit.id,
    shopping_mall_ai_backend_customer_id:
      deposit.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      deposit.shopping_mall_ai_backend_seller_id ?? null,
    total_accrued: deposit.total_accrued,
    usable_balance: deposit.usable_balance,
    expired_balance: deposit.expired_balance,
    on_hold_balance: deposit.on_hold_balance,
    created_at: toISOStringSafe(deposit.created_at),
    updated_at: toISOStringSafe(deposit.updated_at),
    deleted_at:
      deposit.deleted_at !== null ? toISOStringSafe(deposit.deleted_at) : null,
  }));

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
