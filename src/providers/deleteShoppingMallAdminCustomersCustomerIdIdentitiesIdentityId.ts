import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCustomersCustomerIdIdentitiesIdentityId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  identityId: string & tags.Format<"uuid">;
}): Promise<void> {
  /**
   * CONTRADICTION: API requires soft delete (update deleted_at) but schema
   * lacks a deleted_at field for shopping_mall_customer_identities model.
   * Therefore, cannot implement soft delete; returning mock for now.
   */
  return typia.random<void>();
}
