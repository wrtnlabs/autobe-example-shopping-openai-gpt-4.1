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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminDonations(props: {
  admin: AdminPayload;
  body: IShoppingMallDonation.IRequest;
}): Promise<IPageIShoppingMallDonation.ISummary> {
  const body = props.body;
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  // Use satisfies/double assertion pattern to avoid tag mismatches
  const page = Number(rawPage);
  const limit = Number(rawLimit);
  const skip = (page - 1) * limit;

  // Where clause for donations
  const where = {
    deleted_at: null,
    ...(body.shopping_mall_customer_id !== undefined && {
      shopping_mall_customer_id: body.shopping_mall_customer_id,
    }),
    ...(body.source_type !== undefined && {
      source_type: body.source_type,
    }),
    ...(body.target_campaign_code !== undefined && {
      target_campaign_code: body.target_campaign_code,
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.amount_min !== undefined && {
      amount: { gte: body.amount_min },
    }),
    ...(body.amount_max !== undefined && {
      amount: Object.assign(
        {},
        body.amount_min !== undefined ? { gte: body.amount_min } : {},
        { lte: body.amount_max },
      ),
    }),
    ...(body.created_at_from !== undefined &&
      body.created_at_to !== undefined && {
        created_at: { gte: body.created_at_from, lte: body.created_at_to },
      }),
    ...(body.created_at_from !== undefined &&
      body.created_at_to === undefined && {
        created_at: { gte: body.created_at_from },
      }),
    ...(body.created_at_to !== undefined &&
      body.created_at_from === undefined && {
        created_at: { lte: body.created_at_to },
      }),
  };

  // Query donations and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_donations.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_donations.count({
      where,
    }),
  ]);

  // Map to ISummary
  const data = rows.map((donation) => ({
    id: donation.id,
    shopping_mall_customer_id: donation.shopping_mall_customer_id,
    source_type: donation.source_type,
    source_entity_id: donation.source_entity_id,
    target_campaign_code: donation.target_campaign_code,
    amount: donation.amount,
    status: donation.status,
    donated_at: toISOStringSafe(donation.donated_at),
    deleted_at:
      donation.deleted_at != null ? toISOStringSafe(donation.deleted_at) : null,
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
