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

export async function getShoppingMallCustomerDonationsDonationId(props: {
  customer: CustomerPayload;
  donationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDonation> {
  const donation = await MyGlobal.prisma.shopping_mall_donations.findFirst({
    where: {
      id: props.donationId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!donation) {
    throw new HttpException("Donation not found", 404);
  }

  return {
    id: donation.id,
    shopping_mall_customer_id: donation.shopping_mall_customer_id,
    source_type: donation.source_type,
    source_entity_id: donation.source_entity_id,
    target_campaign_code: donation.target_campaign_code,
    amount: donation.amount,
    status: donation.status,
    evidence_reference:
      donation.evidence_reference === null
        ? undefined
        : donation.evidence_reference,
    donated_at: toISOStringSafe(donation.donated_at),
    created_at: toISOStringSafe(donation.created_at),
    updated_at: toISOStringSafe(donation.updated_at),
    deleted_at:
      donation.deleted_at === null
        ? undefined
        : toISOStringSafe(donation.deleted_at),
  };
}
