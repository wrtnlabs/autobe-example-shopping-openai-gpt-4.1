import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { INotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationTemplate";

export async function test_api_notificationTemplates_putById(
  connection: api.IConnection,
) {
  const output: INotificationTemplate =
    await api.functional.notificationTemplates.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<INotificationTemplate.IUpdate>(),
    });
  typia.assert(output);
}
