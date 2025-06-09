import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttachment";

export async function test_api_attachments_eraseById(
  connection: api.IConnection,
) {
  const output: IAttachment = await api.functional.attachments.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
