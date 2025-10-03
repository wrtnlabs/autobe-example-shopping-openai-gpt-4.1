import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAttachmentsAttachmentIdVersionsVersionId(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
  versionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find version and check not already deleted
  const version =
    await MyGlobal.prisma.shopping_mall_attachment_versions.findFirst({
      where: {
        id: props.versionId,
        shopping_mall_attachment_id: props.attachmentId,
        deleted_at: null,
      },
    });
  if (!version) {
    throw new HttpException(
      "Attachment version not found or already deleted.",
      404,
    );
  }

  // Step 2: Soft delete (set deleted_at to now)
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_attachment_versions.update({
    where: {
      id: props.versionId,
    },
    data: {
      deleted_at: deletedAt,
    },
  });
  // No return
}
