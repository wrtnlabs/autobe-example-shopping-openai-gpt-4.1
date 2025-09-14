import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositTransaction";
import { IPageIAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceDepositTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a paginated, filtered list of deposit transactions using search
 * criteria (for account, type, date, etc).
 *
 * Searches, filters, and retrieves paginated deposit transactions from the
 * ai_commerce_deposit_transactions table. Supports filters for
 * deposit_account_id, type, status, performed_at date range, and any supported
 * pagination logic (default: page 1, limit 20). Strictly returns fields per
 * IAiCommerceDepositTransaction, with complete date branding and correct
 * null/undefined handling. No type assertions or native Date usage.
 *
 * @param props - Properties for the operation
 * @param props.admin - Authenticated admin making the request (authorization
 *   already handled)
 * @param props.body - IAiCommerceDepositTransaction.IRequest filter/search
 *   criteria
 * @returns IPageIAiCommerceDepositTransaction - Paginated, filtered transaction
 *   result
 * @throws {Error} On unexpected database query issues
 */
export async function patchaiCommerceAdminDepositTransactions(props: {
  admin: AdminPayload;
  body: IAiCommerceDepositTransaction.IRequest;
}): Promise<IPageIAiCommerceDepositTransaction> {
  // Default pagination (could be implemented/configurable elsewhere)
  const page = 1;
  const limit = 20;
  const { deposit_account_id, type, status, from, to } = props.body ?? {};
  const where = {
    ...(deposit_account_id !== undefined &&
      deposit_account_id !== null && { deposit_account_id }),
    ...(type !== undefined && type !== null && { type }),
    ...(status !== undefined && status !== null && { status }),
    ...(from !== undefined && from !== null && to !== undefined && to !== null
      ? { performed_at: { gte: from, lte: to } }
      : from !== undefined && from !== null
        ? { performed_at: { gte: from } }
        : to !== undefined && to !== null
          ? { performed_at: { lte: to } }
          : {}),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_deposit_transactions.findMany({
      where,
      orderBy: [{ performed_at: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_deposit_transactions.count({ where }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: data.map((row) => {
      return {
        id: row.id,
        deposit_account_id: row.deposit_account_id,
        type: row.type,
        amount: row.amount,
        status: row.status,
        counterparty_reference:
          row.counterparty_reference === null
            ? null
            : (row.counterparty_reference ?? undefined),
        performed_at: toISOStringSafe(row.performed_at),
        created_at: toISOStringSafe(row.created_at),
        updated_at: toISOStringSafe(row.updated_at),
        deleted_at:
          row.deleted_at === null || row.deleted_at === undefined
            ? undefined
            : toISOStringSafe(row.deleted_at),
      };
    }),
  };
}
