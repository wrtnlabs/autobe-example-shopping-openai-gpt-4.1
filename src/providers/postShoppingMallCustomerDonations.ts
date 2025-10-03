import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDonation";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerDonations(props: {
  customer: CustomerPayload;
  body: IShoppingMallDonation.ICreate;
}): Promise<IShoppingMallDonation> {
  const { customer, body } = props;
  // 1. Only allow donation for own customer ID
  if (body.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You may only donate with your own account.",
      403,
    );
  }
  // 2. Only permit source_type 'deposit' | 'mileage'
  if (body.source_type !== "deposit" && body.source_type !== "mileage") {
    throw new HttpException("Invalid donation source_type.", 400);
  }
  // 3. Amount must be > 0
  if (body.amount <= 0) {
    throw new HttpException("Donation amount must be positive.", 400);
  }
  // 4. Validate source_entity ownership & balance
  let source: { balance: number } | null = null;
  if (body.source_type === "deposit") {
    source = await MyGlobal.prisma.shopping_mall_deposits.findFirst({
      where: {
        id: body.source_entity_id,
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
      select: { balance: true },
    });
    if (!source) {
      throw new HttpException(
        "Deposit source not found or does not belong to you.",
        404,
      );
    }
  } else {
    source = await MyGlobal.prisma.shopping_mall_mileages.findFirst({
      where: {
        id: body.source_entity_id,
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
      select: { balance: true },
    });
    if (!source) {
      throw new HttpException(
        "Mileage source not found or does not belong to you.",
        404,
      );
    }
  }
  if (source.balance < body.amount) {
    throw new HttpException("Insufficient balance in donation source.", 400);
  }
  // 5. Insert donation (status: pending)
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_donations.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customer.id,
      source_type: body.source_type,
      source_entity_id: body.source_entity_id,
      target_campaign_code: body.target_campaign_code,
      amount: body.amount,
      status: "pending",
      evidence_reference: body.evidence_reference ?? undefined,
      donated_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Deduct amount from source (business rule: commit donation on creation)
  if (body.source_type === "deposit") {
    await MyGlobal.prisma.shopping_mall_deposits.update({
      where: { id: body.source_entity_id },
      data: { balance: source.balance - body.amount },
    });
  } else {
    await MyGlobal.prisma.shopping_mall_mileages.update({
      where: { id: body.source_entity_id },
      data: { balance: source.balance - body.amount },
    });
  }
  // 7. Return result (convert datetimes)
  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    source_type: created.source_type,
    source_entity_id: created.source_entity_id,
    target_campaign_code: created.target_campaign_code,
    amount: created.amount,
    status: created.status,
    evidence_reference: created.evidence_reference ?? undefined,
    donated_at: toISOStringSafe(created.donated_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
