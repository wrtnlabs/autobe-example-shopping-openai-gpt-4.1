import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerIdentity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCustomersCustomerIdIdentitiesIdentityId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  identityId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerIdentity> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_identities.findFirstOrThrow({
      where: {
        id: props.identityId,
        shopping_mall_customer_id: props.customerId,
      },
    });
  return {
    id: record.id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    identity_type: record.identity_type,
    identity_value: record.identity_value,
    issuer: record.issuer === null ? undefined : record.issuer,
    issue_date:
      record.issue_date === null
        ? undefined
        : toISOStringSafe(record.issue_date),
    verified_at:
      record.verified_at === null
        ? undefined
        : toISOStringSafe(record.verified_at),
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
