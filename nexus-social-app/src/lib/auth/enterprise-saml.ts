// INSTALL: npm install next-auth @auth/core
/**
 * Feature 004 Sprint 17 — Enterprise SAML/SCIM-lite provisioning.
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type SamlAssertionProfile = {
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  agencySlug?: string;
  role?: 'admin' | 'member' | 'viewer';
};

export type SamlProvisionResult = {
  userId: string;
  agencyMemberId?: string;
  isNewUser: boolean;
};

function parseSamlAttributes(attributes: Record<string, string | string[]>): SamlAssertionProfile {
  const pick = (key: string): string | undefined => {
    const val = attributes[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const email = pick('email') ?? pick('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress');
  if (!email) {
    throw new Error('SAML assertion missing email attribute');
  }

  return {
    email: email.toLowerCase(),
    name: pick('displayName') ?? pick('name'),
    givenName: pick('givenName'),
    familyName: pick('familyName'),
    agencySlug: pick('agencySlug') ?? process.env.SAML_DEFAULT_AGENCY_SLUG,
    role: (pick('role') as SamlAssertionProfile['role']) ?? 'member',
  };
}

export async function provisionUserFromSamlAssertion(
  attributes: Record<string, string | string[]>,
): Promise<SamlProvisionResult> {
  const profile = parseSamlAttributes(attributes);

  const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingAuth?.users?.find(
    (u) => u.email?.toLowerCase() === profile.email,
  );

  let userId: string;
  let isNewUser = false;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: profile.email,
      email_confirm: true,
      user_metadata: {
        full_name: profile.name ?? `${profile.givenName ?? ''} ${profile.familyName ?? ''}`.trim(),
        provisioned_via: 'saml',
      },
    });
    if (error || !created.user) {
      throw new Error(error?.message ?? 'Failed to create SAML user');
    }
    userId = created.user.id;
    isNewUser = true;
  }

  let agencyMemberId: string | undefined;

  if (profile.agencySlug) {
    const { data: agency } = await supabaseAdmin
      .from('agencies')
      .select('id')
      .eq('slug', profile.agencySlug)
      .maybeSingle();

    if (agency?.id) {
      const { data: member, error: memberErr } = await supabaseAdmin
        .from('agency_members')
        .upsert(
          {
            agency_id: agency.id,
            user_id: userId,
            role: profile.role ?? 'member',
          },
          { onConflict: 'agency_id,user_id' },
        )
        .select('id')
        .single();

      if (!memberErr && member) {
        agencyMemberId = member.id;
      }
    }
  }

  return { userId, agencyMemberId, isNewUser };
}

export async function issueSupabaseJwtForUser(userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: (
      await supabaseAdmin.auth.admin.getUserById(userId)
    ).data.user?.email ?? '',
  });

  if (error || !data.properties?.hashed_token) {
    throw new Error(error?.message ?? 'Failed to issue Supabase session token');
  }

  return data.properties.hashed_token;
}

export function readSamlEnvConfig() {
  return {
    idpMetadataUrl: process.env.SAML_IDP_METADATA_URL,
    idpEntityId: process.env.SAML_IDP_ENTITY_ID,
    spEntityId: process.env.SAML_SP_ENTITY_ID ?? process.env.NEXT_PUBLIC_APP_URL,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'}/api/auth/callback/saml`,
  };
}
