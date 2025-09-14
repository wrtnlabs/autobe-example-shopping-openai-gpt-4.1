import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositTransaction";
import { IPageIAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceDepositTransaction";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve a paginated, filtered list of deposit transactions using search
 * criteria (for account, type, date, etc).
 *
 * This endpoint searches, filters, and retrieves deposit transaction records
 * owned by the authenticated buyer. Supports filtering based on deposit
 * account, transaction type, status, date range (performed_at), with
 * pagination. Security enforces buyers may only see their own account's
 * transactions. Results are returned as a paginated result with all date fields
 * properly string-branded.
 *
 * @param props - The request context containing authenticated buyer and search
 *   filter (body)
 * @param props.buyer - Authenticated buyer (BuyerPayload) who may only view own
 *   deposit transaction(s)
 * @param props.body - Search request (IAiCommerceDepositTransaction.IRequest):
 *   may contain deposit_account_id, type, status, from/to datetime
 * @returns Paginated result set containing deposit transactions matching filter
 *   (IPageIAiCommerceDepositTransaction)
 * @throws {Error} If authentication or security conditions fail
 */
export async function patchaiCommerceBuyerDepositTransactions(props: {
  buyer: BuyerPayload;
  body: IAiCommerceDepositTransaction.IRequest;
}): Promise<IPageIAiCommerceDepositTransaction> {
  const { buyer, body } = props;
  // Pagination - default page 1, limit 20 (these may be extended in actual SDK, for now defaults are used as standard)
  const page = 1;
  const limit = 20;
  // Step 1. Determine owned deposit account(s)
  let depositAccountIds: (string & tags.Format<"uuid">)[] = [];
  if (body.deposit_account_id !== undefined) {
    // Only allow buyer to view deposit accounts owned by themselves
    const account =
      await MyGlobal.prisma.ai_commerce_deposit_accounts.findFirst({
        where: { id: body.deposit_account_id, user_id: buyer.id },
        select: { id: true },
      });
    if (!account) {
      // No access to requested deposit_account_id; return empty page
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    depositAccountIds = [account.id];
  } else {
    // Get all deposit accounts for this buyer
    const accounts =
      await MyGlobal.prisma.ai_commerce_deposit_accounts.findMany({
        where: { user_id: buyer.id },
        select: { id: true },
      });
    depositAccountIds = accounts.map((item) => item.id);
    if (depositAccountIds.length === 0) {
      // No deposit accounts for buyer; return empty
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }
  // Step 2. Construct filter conditions
  const where = {
    deposit_account_id: { in: depositAccountIds },
    ...(body.type !== undefined && { type: body.type }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.from !== undefined || body.to !== undefined
      ? {
          performed_at: {
            ...(body.from !== undefined && { gte: body.from }),
            ...(body.to !== undefined && { lte: body.to }),
          },
        }
      : {}),
  };
  // Step 3. Paginated fetch + total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_deposit_transactions.findMany({
      where,
      orderBy: { performed_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_deposit_transactions.count({ where }),
  ]);
  // Step 4. Map results to DTO, format date fields, respect null/optional branding
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((tx) => ({
      id: tx.id,
      deposit_account_id: tx.deposit_account_id,
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      counterparty_reference: tx.counterparty_reference ?? null,
      performed_at: toISOStringSafe(tx.performed_at),
      created_at: toISOStringSafe(tx.created_at),
      updated_at: toISOStringSafe(tx.updated_at),
      deleted_at: tx.deleted_at ? toISOStringSafe(tx.deleted_at) : undefined,
    })),
  };
}
