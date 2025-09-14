import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageTransaction";
import { IPageIAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceMileageTransaction";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * List and search mileage transactions with filtering and pagination.
 *
 * Retrieves a filtered and paginated list of mileage transaction records for
 * the authenticated buyer. Enables full audit, search, and analytics for
 * individual mileage events (accrual, redemption, adjustment, expiration)
 * stored in ai_commerce_mileage_transactions. Applies all filters and limits
 * from the request body and enforces strict ownership for buyer role (no
 * cross-user access permitted).
 *
 * @param props - Request parameter object
 * @param props.buyer - BuyerPayload for the authenticated user
 * @param props.body - Query filters, pagination, and sorting for mileage
 *   transactions
 * @returns Paginated transactions in IPageIAiCommerceMileageTransaction
 *   structure
 * @throws {Error} If the specified mileage account does not belong to the buyer
 */
export async function patchaiCommerceBuyerMileageTransactions(props: {
  buyer: BuyerPayload;
  body: IAiCommerceMileageTransaction.IRequest;
}): Promise<IPageIAiCommerceMileageTransaction> {
  const { buyer, body } = props;

  // Step 1: Determine all valid account(s) for this buyer
  const mileageAccounts =
    await MyGlobal.prisma.ai_commerce_mileage_accounts.findMany({
      where: { user_id: buyer.id, deleted_at: null },
      select: { id: true },
    });
  const allowedAccountIds = mileageAccounts.map((a) => a.id);

  // Step 2: If body.accountId is provided, ensure buyer owns it
  if (body.accountId !== undefined) {
    if (!allowedAccountIds.includes(body.accountId)) {
      throw new Error("Access denied: account does not belong to this buyer");
    }
  }
  const targetAccountIds =
    body.accountId !== undefined ? [body.accountId] : allowedAccountIds;

  // Step 3: Build where filter (functional, immutable)
  const where = {
    mileage_account_id: { in: targetAccountIds },
    ...(body.type !== undefined && { type: body.type }),
    ...(body.status !== undefined && { status: body.status }),
    ...((body.minAmount !== undefined || body.maxAmount !== undefined) && {
      amount: {
        ...(body.minAmount !== undefined && { gte: body.minAmount }),
        ...(body.maxAmount !== undefined && { lte: body.maxAmount }),
      },
    }),
    ...((body.startDate !== undefined || body.endDate !== undefined) && {
      transacted_at: {
        ...(body.startDate !== undefined && { gte: body.startDate }),
        ...(body.endDate !== undefined && { lte: body.endDate }),
      },
    }),
  };

  // Step 4: Pagination logic (defaults and branding)
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  const page = Number(rawPage);
  const limit = Number(rawLimit);
  const skip = (page - 1) * limit;

  // Step 5: Allowed sort fields
  const allowedSortBy = [
    "created_at",
    "updated_at",
    "transacted_at",
    "amount",
    "type",
    "status",
  ];
  const sortBy = allowedSortBy.includes(body.sortBy ?? "")
    ? body.sortBy
    : "transacted_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  // Step 6: Query both data and count atomically
  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_mileage_transactions.findMany({
      where,
      orderBy: { [sortBy!]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_mileage_transactions.count({ where }),
  ]);

  // Step 7: DTO transformation with correct null/undefined and branding
  const data = transactions.map((row) => ({
    id: row.id,
    mileage_account_id: row.mileage_account_id,
    type: row.type,
    amount: row.amount,
    status: row.status,
    reference_entity:
      row.reference_entity === null ? undefined : row.reference_entity,
    transacted_at: toISOStringSafe(row.transacted_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== undefined && row.deleted_at !== null
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  // Step 8: Paginated output
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
