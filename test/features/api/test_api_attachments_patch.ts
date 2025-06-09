import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttachment";
import { IAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttachment";

export async function test_api_attachments_patch(connection: api.IConnection) {
  const output: IPageIAttachment = await api.functional.attachments.patch(
    connection,
    {
      body: typia.random<IAttachment.IRequest>(),
    },
  );
  typia.assert(output);
}
