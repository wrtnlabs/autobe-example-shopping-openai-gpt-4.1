import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalAccount";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCustomersCustomerIdExternalAccountsExternalAccountId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  externalAccountId: string & tags.Format<"uuid">;
  body: IShoppingMallExternalAccount.IUpdate;
}): Promise<IShoppingMallExternalAccount> {
  // Ownership enforcement & record must exist
  const record =
    await MyGlobal.prisma.shopping_mall_external_accounts.findFirst({
      where: {
        id: props.externalAccountId,
        shopping_mall_customer_id: props.customerId,
      },
    });
  if (!record) {
    throw new HttpException("External account not found or unauthorized", 404);
  }
  if (record.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You may only update your own account",
      403,
    );
  }

  // Only update allowed fields
  const updated = await MyGlobal.prisma.shopping_mall_external_accounts.update({
    where: { id: props.externalAccountId },
    data: {
      status: props.body.status ?? undefined,
      linked_at: props.body.linked_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    provider: updated.provider,
    external_user_id: updated.external_user_id,
    linked_at: toISOStringSafe(updated.linked_at),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
