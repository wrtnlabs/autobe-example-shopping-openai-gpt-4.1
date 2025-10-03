import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallUserAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserAgreement";
import { IPageIShoppingMallUserAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserAgreement";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminUserAgreements(props: {
  admin: AdminPayload;
  body: IShoppingMallUserAgreement.IRequest;
}): Promise<IPageIShoppingMallUserAgreement.ISummary> {
  const {
    actor_id,
    actor_type,
    agreement_type,
    version,
    accepted_at_from,
    accepted_at_to,
    withdrawn_at_from,
    withdrawn_at_to,
    page,
    limit,
    sort_by,
    sort_direction,
  } = props.body;

  // Pagination parameters
  const rawPage = page ?? 1;
  const rawLimit = limit ?? 20;
  const safeLimit = rawLimit > 250 ? 250 : rawLimit;
  const safePage = rawPage < 1 ? 1 : rawPage;
  const skip = (safePage - 1) * safeLimit;

  // Sort config
  const ALLOWED_SORT_FIELDS = ["accepted_at", "withdrawn_at", "created_at"];
  const allowedSortBy =
    typeof sort_by === "string" && ALLOWED_SORT_FIELDS.includes(sort_by)
      ? sort_by
      : "created_at";

  const direction = sort_direction === "asc" ? "asc" : "desc";

  // Build where condition
  const where: Record<string, any> = {
    ...(actor_id !== undefined && actor_id !== null && { actor_id }),
    ...(actor_type !== undefined && actor_type !== null && { actor_type }),
    ...(agreement_type !== undefined &&
      agreement_type !== null && {
        agreement_type,
      }),
    ...(version !== undefined && version !== null && { version }),
    ...((accepted_at_from !== undefined && accepted_at_from !== null) ||
    (accepted_at_to !== undefined && accepted_at_to !== null)
      ? {
          accepted_at: {
            ...(accepted_at_from !== undefined &&
              accepted_at_from !== null && {
                gte: accepted_at_from,
              }),
            ...(accepted_at_to !== undefined &&
              accepted_at_to !== null && {
                lte: accepted_at_to,
              }),
          },
        }
      : {}),
    ...((withdrawn_at_from !== undefined && withdrawn_at_from !== null) ||
    (withdrawn_at_to !== undefined && withdrawn_at_to !== null)
      ? {
          withdrawn_at: {
            ...(withdrawn_at_from !== undefined &&
              withdrawn_at_from !== null && {
                gte: withdrawn_at_from,
              }),
            ...(withdrawn_at_to !== undefined &&
              withdrawn_at_to !== null && {
                lte: withdrawn_at_to,
              }),
          },
        }
      : {}),
  };

  // Query DB
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_mall_user_agreements.count({ where }),
    MyGlobal.prisma.shopping_mall_user_agreements.findMany({
      where,
      orderBy: { [allowedSortBy]: direction },
      skip,
      take: safeLimit,
      select: {
        id: true,
        actor_id: true,
        actor_type: true,
        agreement_type: true,
        version: true,
        accepted_at: true,
        withdrawn_at: true,
        created_at: true,
      },
    }),
  ]);

  // Map results
  const data = rows.map((row) => ({
    id: row.id,
    actor_id: row.actor_id,
    actor_type: row.actor_type,
    agreement_type: row.agreement_type,
    version: row.version,
    accepted_at: toISOStringSafe(row.accepted_at),
    withdrawn_at:
      row.withdrawn_at !== undefined && row.withdrawn_at !== null
        ? toISOStringSafe(row.withdrawn_at)
        : undefined,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeLimit),
      records: total,
      pages: Number(Math.ceil(total / safeLimit)),
    },
    data,
  };
}
