import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttachment";

export async function test_api_attachments_putById(
  connection: api.IConnection,
) {
  const output: IAttachment = await api.functional.attachments.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAttachment.IUpdate>(),
    },
  );
  typia.assert(output);
}
