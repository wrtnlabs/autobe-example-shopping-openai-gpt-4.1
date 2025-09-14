import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageTransaction";
import { IPageIAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceMileageTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and search mileage transactions with filtering and pagination.
 *
 * This endpoint enables an admin to retrieve a paginated and filtered list of
 * mileage transaction records (including accrual, redemption, adjustment, and
 * expiration) as stored in ai_commerce_mileage_transactions. It supports
 * advanced search criteria, sorting, status/type filters, date bounds, and
 * pagination fields defined by IAiCommerceMileageTransaction.IRequest. All date
 * values are handled as ISO date strings using toISOStringSafe to guarantee
 * type compatibility.
 *
 * @param props - The request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.body - The filter and pagination/search settings
 * @returns Paginated list of mileage transactions matching the filter
 * @throws {Error} If any Prisma/database failure occurs
 */
export async function patchaiCommerceAdminMileageTransactions(props: {
  admin: AdminPayload;
  body: IAiCommerceMileageTransaction.IRequest;
}): Promise<IPageIAiCommerceMileageTransaction> {
  const { body } = props;
  const allowedSortFields = [
    "id",
    "mileage_account_id",
    "type",
    "amount",
    "status",
    "reference_entity",
    "transacted_at",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Build where object, skipping undefined fields
  const where = {
    ...(body.accountId !== undefined && { mileage_account_id: body.accountId }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.minAmount !== undefined && body.maxAmount !== undefined
      ? { amount: { gte: body.minAmount, lte: body.maxAmount } }
      : body.minAmount !== undefined
        ? { amount: { gte: body.minAmount } }
        : body.maxAmount !== undefined
          ? { amount: { lte: body.maxAmount } }
          : {}),
    ...(body.startDate !== undefined && body.endDate !== undefined
      ? { transacted_at: { gte: body.startDate, lte: body.endDate } }
      : body.startDate !== undefined
        ? { transacted_at: { gte: body.startDate } }
        : body.endDate !== undefined
          ? { transacted_at: { lte: body.endDate } }
          : {}),
  };
  const sortBy =
    body.sortBy && allowedSortFields.includes(body.sortBy)
      ? body.sortBy
      : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_mileage_transactions.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_mileage_transactions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      mileage_account_id: row.mileage_account_id,
      type: row.type,
      amount: row.amount,
      status: row.status,
      reference_entity:
        row.reference_entity === undefined ? undefined : row.reference_entity,
      transacted_at: toISOStringSafe(row.transacted_at),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null || row.deleted_at === undefined
          ? undefined
          : toISOStringSafe(row.deleted_at),
    })),
  };
}
