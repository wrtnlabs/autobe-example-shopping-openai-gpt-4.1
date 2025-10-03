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

export async function getShoppingMallCustomerCustomersCustomerIdExternalAccountsExternalAccountId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  externalAccountId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallExternalAccount> {
  // Authorization: Only the owning customer can view
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Forbidden: You are not allowed to access another user's external account.",
      403,
    );
  }

  const account =
    await MyGlobal.prisma.shopping_mall_external_accounts.findUnique({
      where: {
        id: props.externalAccountId,
      },
    });

  if (!account) {
    throw new HttpException("External account not found", 404);
  }

  if (account.shopping_mall_customer_id !== props.customerId) {
    // Invariant safety: should never hit, but defense-in-depth if id isn't unique globally
    throw new HttpException(
      "External account does not belong to this customer",
      403,
    );
  }

  return {
    id: account.id,
    shopping_mall_customer_id: account.shopping_mall_customer_id,
    provider: account.provider,
    external_user_id: account.external_user_id,
    linked_at: toISOStringSafe(account.linked_at),
    status: account.status,
    created_at: toISOStringSafe(account.created_at),
    updated_at: toISOStringSafe(account.updated_at),
  };
}
