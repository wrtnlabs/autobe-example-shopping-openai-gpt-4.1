import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageTransaction";
import { IPageIAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceMileageTransaction";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchaiCommerceSellerMileageTransactions(props: {
  seller: SellerPayload;
  body: IAiCommerceMileageTransaction.IRequest;
}): Promise<IPageIAiCommerceMileageTransaction> {
  const { seller, body } = props;

  // Step 1: Find all mileage accounts owned by this seller (user_id = seller.id),
  // optionally filter by accountId if provided.
  const accountWhere = {
    user_id: seller.id,
    ...(body.accountId !== undefined &&
      body.accountId !== null && { id: body.accountId }),
  };
  const accounts = await MyGlobal.prisma.ai_commerce_mileage_accounts.findMany({
    where: accountWhere,
  });
  const mileageAccountIds = accounts.map((a) => a.id);
  if (mileageAccountIds.length === 0) {
    const page = Number(body.page ?? 1);
    const limit = Number(body.limit ?? 20);
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

  // Build transaction filters
  const amount: Record<string, number> = {};
  if (body.minAmount !== undefined && body.minAmount !== null) {
    amount.gte = body.minAmount;
  }
  if (body.maxAmount !== undefined && body.maxAmount !== null) {
    amount.lte = body.maxAmount;
  }

  const where = {
    mileage_account_id: { in: mileageAccountIds },
    ...(body.type !== undefined && body.type !== null && { type: body.type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(amount.gte !== undefined || amount.lte !== undefined ? { amount } : {}),
    ...((body.startDate !== undefined && body.startDate !== null) ||
    (body.endDate !== undefined && body.endDate !== null)
      ? {
          transacted_at: {
            ...(body.startDate !== undefined &&
              body.startDate !== null && { gte: body.startDate }),
            ...(body.endDate !== undefined &&
              body.endDate !== null && { lte: body.endDate }),
          },
        }
      : {}),
  };

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Inline orderBy to avoid type errors
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ai_commerce_mileage_transactions.count({ where }),
    MyGlobal.prisma.ai_commerce_mileage_transactions.findMany({
      where,
      orderBy:
        body.sortBy && body.sortOrder
          ? { [body.sortBy]: body.sortOrder as "asc" | "desc" }
          : { created_at: "desc" as const },
      skip,
      take: limit,
    }),
  ]);

  const data: IAiCommerceMileageTransaction[] = rows.map((tx) => ({
    id: tx.id,
    mileage_account_id: tx.mileage_account_id,
    type: tx.type as "accrual" | "redemption" | "adjustment" | "expiration",
    amount: tx.amount,
    status: tx.status,
    reference_entity:
      tx.reference_entity === null ? undefined : tx.reference_entity,
    transacted_at: toISOStringSafe(tx.transacted_at),
    created_at: toISOStringSafe(tx.created_at),
    updated_at: toISOStringSafe(tx.updated_at),
    ...(typeof tx.deleted_at !== "undefined" &&
      tx.deleted_at !== null && { deleted_at: toISOStringSafe(tx.deleted_at) }),
    ...(typeof tx.deleted_at !== "undefined" &&
      tx.deleted_at === null && { deleted_at: null }),
  }));
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
