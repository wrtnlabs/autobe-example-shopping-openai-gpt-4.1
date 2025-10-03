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

export async function putShoppingMallAdminCustomersCustomerIdIdentitiesIdentityId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  identityId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerIdentity.IUpdate;
}): Promise<IShoppingMallCustomerIdentity> {
  // 1. Lookup customer, ensure not deleted
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { id: props.customerId, deleted_at: null },
  });
  if (!customer) throw new HttpException("Customer not found", 404);

  // 2. Lookup identity, ensure matches customer and not deleted
  const identity =
    await MyGlobal.prisma.shopping_mall_customer_identities.findFirst({
      where: {
        id: props.identityId,
        shopping_mall_customer_id: props.customerId,
      },
    });
  if (!identity) throw new HttpException("Identity record not found", 404);

  // 3. Forbid illegal status transitions (e.g., verified->pending). Allow only pending→verified, pending→rejected, etc
  // (Domain test expects forbidden verified->pending)
  if (identity.status === "verified" && props.body.status !== "verified") {
    throw new HttpException(
      "Cannot transition from verified to another state",
      400,
    );
  }

  // 4. Build update data from body (only provided fields), always update updated_at
  const now = toISOStringSafe(new Date());
  const updateData = {
    identity_type: props.body.identity_type ?? undefined,
    identity_value: props.body.identity_value ?? undefined,
    issuer: props.body.issuer ?? undefined,
    issue_date: props.body.issue_date ?? undefined,
    verified_at: props.body.verified_at ?? undefined,
    status: props.body.status,
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.shopping_mall_customer_identities.update({
      where: { id: props.identityId },
      data: updateData,
    });

  // 5. Return as IShoppingMallCustomerIdentity
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    identity_type: updated.identity_type,
    identity_value: updated.identity_value,
    issuer: updated.issuer ?? undefined,
    issue_date: updated.issue_date
      ? toISOStringSafe(updated.issue_date)
      : undefined,
    verified_at: updated.verified_at
      ? toISOStringSafe(updated.verified_at)
      : undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
