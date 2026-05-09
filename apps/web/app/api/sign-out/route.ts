import { signOut } from "@workos-inc/authkit-nextjs";

export async function POST() {
  await signOut({ returnTo: "/" });
  return new Response(null, { status: 302, headers: { Location: "/" } });
}
