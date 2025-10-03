import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCustomersCustomerIdExternalAccountsExternalAccountId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  externalAccountId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Authorization: customer (must match customer.id)
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Unauthorized: You can only remove your own external accounts",
      403,
    );
  }
  // Lookup active external account ownership
  const externalAccount =
    await MyGlobal.prisma.shopping_mall_external_accounts.findFirst({
      where: {
        id: props.externalAccountId,
        shopping_mall_customer_id: props.customerId,
      },
    });
  if (!externalAccount) {
    throw new HttpException("External account not found", 404);
  }
  // Hard delete since schema does not support soft delete
  await MyGlobal.prisma.shopping_mall_external_accounts.delete({
    where: { id: props.externalAccountId },
  });
}
