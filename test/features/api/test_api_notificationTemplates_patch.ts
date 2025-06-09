import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageINotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationTemplate";
import { INotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationTemplate";

export async function test_api_notificationTemplates_patch(
  connection: api.IConnection,
) {
  const output: IPageINotificationTemplate =
    await api.functional.notificationTemplates.patch(connection, {
      body: typia.random<INotificationTemplate.IRequest>(),
    });
  typia.assert(output);
}
