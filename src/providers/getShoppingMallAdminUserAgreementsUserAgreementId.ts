import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallUserAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserAgreement";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminUserAgreementsUserAgreementId(props: {
  admin: AdminPayload;
  userAgreementId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserAgreement> {
  const agreement =
    await MyGlobal.prisma.shopping_mall_user_agreements.findFirst({
      where: {
        id: props.userAgreementId,
      },
    });
  if (!agreement) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: agreement.id,
    actor_id: agreement.actor_id,
    actor_type: agreement.actor_type,
    agreement_type: agreement.agreement_type,
    version: agreement.version,
    accepted_at: toISOStringSafe(agreement.accepted_at),
    withdrawn_at: agreement.withdrawn_at
      ? toISOStringSafe(agreement.withdrawn_at)
      : undefined,
    created_at: toISOStringSafe(agreement.created_at),
  };
}
