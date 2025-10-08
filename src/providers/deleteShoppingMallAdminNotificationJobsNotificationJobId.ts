import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminNotificationJobsNotificationJobId(props: {
  admin: AdminPayload;
  notificationJobId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the notification job (must exist and not be deleted)
  const notificationJob =
    await MyGlobal.prisma.shopping_mall_notification_jobs.findFirst({
      where: {
        id: props.notificationJobId,
        deleted_at: null,
      },
    });

  if (!notificationJob) {
    throw new HttpException(
      "Notification job does not exist or is already deleted.",
      404,
    );
  }

  // Soft-delete (set deleted_at to now)
  await MyGlobal.prisma.shopping_mall_notification_jobs.update({
    where: { id: props.notificationJobId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
