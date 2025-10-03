import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDonation";
import { IPageIShoppingMallDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDonation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerDonations(props: {
  customer: CustomerPayload;
  body: IShoppingMallDonation.IRequest;
}): Promise<IPageIShoppingMallDonation.ISummary> {
  const { customer, body } = props;

  // Parse pagination parameters, always numeric
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Prepare Prisma where clause: always enforce customer ID for privacy
  const where = {
    shopping_mall_customer_id: customer.id,
    ...(body.source_type !== undefined && { source_type: body.source_type }),
    ...(body.target_campaign_code !== undefined && {
      target_campaign_code: body.target_campaign_code,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.amount_min !== undefined || body.amount_max !== undefined
      ? {
          amount: {
            ...(body.amount_min !== undefined && { gte: body.amount_min }),
            ...(body.amount_max !== undefined && { lte: body.amount_max }),
          },
        }
      : {}),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          donated_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
    deleted_at: null,
  };

  // Fetch data and count in parallel
  const [donations, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_donations.findMany({
      where,
      orderBy: { donated_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_donations.count({ where }),
  ]);

  // Transform results into summaries
  const data = donations.map((row) => ({
    id: row.id,
    shopping_mall_customer_id: row.shopping_mall_customer_id,
    source_type: row.source_type,
    source_entity_id: row.source_entity_id,
    target_campaign_code: row.target_campaign_code,
    amount: row.amount,
    status: row.status,
    donated_at: toISOStringSafe(row.donated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  // Build and return pagination structure
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
