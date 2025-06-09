import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserIdentityVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserIdentityVerification";
import { IUserIdentityVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserIdentityVerification";

export async function test_api_userIdentityVerifications_patch(
  connection: api.IConnection,
) {
  const output: IPageIUserIdentityVerification =
    await api.functional.userIdentityVerifications.patch(connection, {
      body: typia.random<IUserIdentityVerification.IRequest>(),
    });
  typia.assert(output);
}
