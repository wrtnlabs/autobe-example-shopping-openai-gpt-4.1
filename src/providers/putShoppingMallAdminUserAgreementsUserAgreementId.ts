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

export async function putShoppingMallAdminUserAgreementsUserAgreementId(props: {
  admin: AdminPayload;
  userAgreementId: string & tags.Format<"uuid">;
  body: IShoppingMallUserAgreement.IUpdate;
}): Promise<IShoppingMallUserAgreement> {
  const { userAgreementId, body } = props;

  await MyGlobal.prisma.shopping_mall_user_agreements.findUniqueOrThrow({
    where: { id: userAgreementId },
  });

  const updated = await MyGlobal.prisma.shopping_mall_user_agreements.update({
    where: { id: userAgreementId },
    data: {
      ...(body.accepted_at !== undefined &&
        body.accepted_at !== null && {
          accepted_at: toISOStringSafe(body.accepted_at),
        }),
      ...(body.withdrawn_at !== undefined &&
        body.withdrawn_at !== null && {
          withdrawn_at: toISOStringSafe(body.withdrawn_at),
        }),
      ...(body.agreement_type !== undefined &&
        body.agreement_type !== null && {
          agreement_type: body.agreement_type,
        }),
      ...(body.version !== undefined &&
        body.version !== null && {
          version: body.version,
        }),
    },
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
  });

  return {
    id: updated.id,
    actor_id: updated.actor_id,
    actor_type: updated.actor_type,
    agreement_type: updated.agreement_type,
    version: updated.version,
    accepted_at: toISOStringSafe(updated.accepted_at),
    withdrawn_at:
      updated.withdrawn_at !== undefined && updated.withdrawn_at !== null
        ? toISOStringSafe(updated.withdrawn_at)
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
