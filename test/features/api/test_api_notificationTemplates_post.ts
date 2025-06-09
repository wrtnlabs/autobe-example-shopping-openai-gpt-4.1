import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { INotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationTemplate";

export async function test_api_notificationTemplates_post(
  connection: api.IConnection,
) {
  const output: INotificationTemplate =
    await api.functional.notificationTemplates.post(connection, {
      body: typia.random<INotificationTemplate.ICreate>(),
    });
  typia.assert(output);
}
