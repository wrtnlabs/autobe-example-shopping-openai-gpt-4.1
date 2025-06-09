import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserIdentityVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserIdentityVerification";

export async function test_api_userIdentityVerifications_getById(
  connection: api.IConnection,
) {
  const output: IUserIdentityVerification =
    await api.functional.userIdentityVerifications.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
