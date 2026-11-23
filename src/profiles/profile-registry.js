const profiles = new Map();

export function registerProfile(profile) {
  if (!profile?.id || typeof profile.id !== "string") {
    throw new TypeError("A musical profile must have a string id.");
  }
  if (profiles.has(profile.id)) {
    throw new Error(`Musical profile already registered: ${profile.id}`);
  }
  profiles.set(profile.id, Object.freeze(profile));
  return profile;
}

export function getProfile(id) {
  const profile = profiles.get(id);
  if (!profile) throw new Error(`Unknown musical profile: ${id}`);
  return profile;
}

export function listProfiles() {
  return [...profiles.values()];
}
