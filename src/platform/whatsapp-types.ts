/** WhatsApp Account Information report insights (no chat messages). */

export type WhatsAppProfile = {
  phone: string
  username: string
  about: string
  birthYear?: string | null
  profilePictureUri?: string | null
  aboutSetAt?: number | null
  reportRequestTime?: number | null
  reportGenerationTime?: number | null
  registrationTimestamp?: number | null
}

export type WhatsAppDeviceActivity = {
  deviceId: string
  status: string
  lastActive?: number | null
  previousIp?: string | null
  currentIp?: string | null
}

export type WhatsAppDeviceInfo = {
  deviceId: number
  appVersion: string
  operatingSystemVersion: string
  deviceManufacturer: string
  deviceModel: string
}

export type WhatsAppContact = {
  phone: string
  name?: string | null
}

export type WhatsAppPrivacySettings = {
  lastSeen?: string | null
  profilePhoto?: string | null
  about?: string | null
  status?: string[]
  readReceipts?: string | null
  groupCreate?: string | null
}

export type WhatsAppAccountsCenter = {
  linkState?: string | null
  creationTime?: number | null
}

export type WhatsAppTermsOfService = {
  tosAccepted2021: boolean
  tosAcceptTime2021?: number | null
  wamoPptosAccepted: boolean
  wamoPptosAcceptTime?: number | null
}

export type WhatsAppInsights = {
  profile: WhatsAppProfile
  contactCount: number
  groupCount: number
  blockedCount: number
  deviceCount: number
  sessionDays7d?: number | null
  sessionDays30d?: number | null
  contacts: WhatsAppContact[]
  groups: string[]
  blockedNumbers: string[]
  deviceActivity: WhatsAppDeviceActivity[]
  devices: WhatsAppDeviceInfo[]
  privacy: WhatsAppPrivacySettings
  accountsCenter: WhatsAppAccountsCenter
  termsOfService: WhatsAppTermsOfService
}

export function emptyWhatsAppInsights(): WhatsAppInsights {
  return {
    profile: {
      phone: "",
      username: "",
      about: "",
    },
    contactCount: 0,
    groupCount: 0,
    blockedCount: 0,
    deviceCount: 0,
    contacts: [],
    groups: [],
    blockedNumbers: [],
    deviceActivity: [],
    devices: [],
    privacy: { status: [] },
    accountsCenter: {},
    termsOfService: {
      tosAccepted2021: false,
      wamoPptosAccepted: false,
    },
  }
}

export function normalizeWhatsAppInsights(
  raw?: Partial<WhatsAppInsights> | null
): WhatsAppInsights {
  const base = emptyWhatsAppInsights()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    contacts: Array.isArray(raw.contacts) ? raw.contacts : base.contacts,
    groups: Array.isArray(raw.groups) ? raw.groups : base.groups,
    blockedNumbers: Array.isArray(raw.blockedNumbers)
      ? raw.blockedNumbers
      : base.blockedNumbers,
    deviceActivity: Array.isArray(raw.deviceActivity)
      ? raw.deviceActivity
      : base.deviceActivity,
    devices: Array.isArray(raw.devices) ? raw.devices : base.devices,
    privacy: {
      ...base.privacy,
      ...(raw.privacy ?? {}),
      status: Array.isArray(raw.privacy?.status)
        ? raw.privacy.status
        : (base.privacy.status ?? []),
    },
    accountsCenter: {
      ...base.accountsCenter,
      ...(raw.accountsCenter ?? {}),
    },
    termsOfService: {
      ...base.termsOfService,
      ...(raw.termsOfService ?? {}),
    },
  }
}
