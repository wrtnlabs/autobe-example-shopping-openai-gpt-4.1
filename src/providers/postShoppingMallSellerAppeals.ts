import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAppeal";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerAppeals(props: {
  seller: SellerPayload;
  body: IShoppingMallAppeal.ICreate;
}): Promise<IShoppingMallAppeal> {
  const { seller, body } = props;
  // Validate referenced escalation exists and is active (not deleted)
  const escalation = await MyGlobal.prisma.shopping_mall_escalations.findFirst({
    where: {
      id: body.escalation_id,
      deleted_at: null,
    },
  });
  if (!escalation) {
    throw new HttpException(
      "Referenced escalation does not exist or has been deleted.",
      404,
    );
  }
  if (escalation.initiator_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You are not the seller associated with this escalation.",
      403,
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_appeals.create({
    data: {
      id: v4(),
      escalation_id: body.escalation_id,
      appellant_seller_id: seller.id,
      appeal_type: body.appeal_type,
      appeal_status: "pending",
      resolution_type: null,
      resolution_comment: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    escalation_id: created.escalation_id,
    appellant_seller_id: created.appellant_seller_id,
    appeal_type: created.appeal_type,
    appeal_status: created.appeal_status,
    resolution_type: created.resolution_type,
    resolution_comment: created.resolution_comment,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
    // Optional fields
    appellant_customer_id: undefined,
    reviewing_admin_id: undefined,
  };
}
