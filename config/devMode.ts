// ─── Dev Mode Flag ────────────────────────────────────────────────
// Set to true while building UI — bypasses Firebase auth entirely.
// Set to false when you're ready to connect the real backend.
export const DEV_MODE = true;

export const DEV_USER = {
  uid:          'dev-user-001',
  fullName:     'Sharon Raj',
  email:        'sharon@aesthetiq.app',
  profileImage: undefined as string | undefined,
};
