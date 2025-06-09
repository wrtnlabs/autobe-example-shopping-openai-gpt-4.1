import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttachment";

export async function test_api_attachments_post(connection: api.IConnection) {
  const output: IAttachment = await api.functional.attachments.post(
    connection,
    {
      body: typia.random<IAttachment.ICreate>(),
    },
  );
  typia.assert(output);
}
