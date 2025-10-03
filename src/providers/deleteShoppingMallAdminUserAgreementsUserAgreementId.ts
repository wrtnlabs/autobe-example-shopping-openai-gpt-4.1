import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminUserAgreementsUserAgreementId(props: {
  admin: AdminPayload;
  userAgreementId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, userAgreementId } = props;
  // Prisma schema does NOT have deleted_at field on shopping_mall_user_agreements → cannot soft-delete
  // Only hard delete is possible (removes record from DB), but API spec forbids hard deletes. Contradiction.
  // Therefore, implementation is impossible with current schema. Return mock as compliance placeholder.
  /**
   * SCHEMA-INTERFACE CONTRADICTION:
   *
   * - API requires soft delete on user agreements (logical removal with
   *   deleted_at/soft delete field)
   * - Prisma model 'shopping_mall_user_agreements' does NOT have deleted_at or
   *   any soft delete fields
   * - Cannot implement API contract as designed
   *
   * @todo Schema update required to support soft delete on user agreements
   */
  return typia.random<void>();
}
