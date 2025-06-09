import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { INotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationTemplate";

export async function test_api_notificationTemplates_eraseById(
  connection: api.IConnection,
) {
  const output: INotificationTemplate =
    await api.functional.notificationTemplates.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
