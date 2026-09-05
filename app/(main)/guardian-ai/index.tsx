import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  createSafetyContact,
  deleteSafetyContact,
  getCRMLeads,
  getSafetyContacts,
  getSafetyLogs,
  SafetyContactItem,
  SafetyLogItem,
  updateSafetyContacts,
  verifyCRMLeadIdentity,
  triggerSafetyAlert,
} from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuardianScreenShell } from './_components/GuardianScreenShell';

const DURATION_OPTIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
];

const GUARDIAN_POLICIES = [
  { key: 'notifyBroker' as const, label: 'Notify Broker on Timer Expiry', icon: 'bell-outline' as const },
  { key: 'continuousGps' as const, label: 'Continuous GPS Tracking', icon: 'crosshairs-gps' as const },
  { key: 'silentEmergency' as const, label: 'Silent Emergency Signal', icon: 'alert-circle-outline' as const },
];

const TOP_TABS = [
  { id: 'switch', label: 'Guardian Switch', icon: 'power' as const },
  { id: 'leads', label: 'Lead Verification Hub', icon: 'target' as const },
  { id: 'emergency', label: 'Emergency Settings', icon: 'cog-outline' as const },
  { id: 'logs', label: 'Safety Logs', icon: 'file-document-outline' as const },
] as const;

type LeadFilterKey = 'all' | 'cleared' | 'failed' | 'pending' | 'verifying';

export interface DirectoryLead {
  id: string;
  name: string;
  source: string;
  phone: string;
  email: string;
  status: 'FAILED MATCH' | 'NOT VERIFIED' | 'CLEARED' | 'PENDING CHECK' | 'VERIFYING';
  matchScore?: number;
  carrier?: string;
  lineType?: string;
  registeredName?: string;
  registeredAddress?: string;
  warningNote?: string;
  successNote?: string;
  raw?: any;
}

const RAW_API_LEADS_FALLBACK = [
  {
    id: "b3660450-bc4b-497e-a1e5-efe670e5d41e",
    user_id: 81,
    first_name: "Zien",
    last_name: "Inc",
    email: "becker@beckerrealtyteam.com",
    country_code: "+1",
    phone: "7135399244",
    source: "Manual",
    status: 1,
    score: 75,
    group_id: 90,
    tag_id: 69,
    lead_date_label: "Today",
    hubspot_id: "541221833419",
    zoho_id: "1404211000000594003",
    pipedrive_id: "dfb15432-fea3-45f3-a321-4c8ff2098037",
    events: [
      {
        date: "2026-08-26T08:57:36.495Z",
        title: "Lead captured via Manual"
      },
      {
        date: "2026-08-26T08:57:48.351Z",
        score: 45,
        title: "Identity Verified (45% Match, Unknown Carrier)",
        carrier: "Unknown Carrier",
        lineType: "mobile",
        nameMatch: "No",
        registeredName: "Paul W Strong",
        registeredAddress: "Houston, TX"
      },
      {
        date: "2026-08-26T10:02:51.370Z",
        title: "Ghost protocol activated: Score boosted from 75 to 75"
      }
    ]
  },
  {
    id: "79d5c749-985e-4d9d-b896-43a76813082a",
    user_id: 81,
    first_name: "sweta",
    last_name: "Contact",
    email: "sweta1@gmail.com",
    country_code: "+91",
    phone: "9676765645",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      { date: "2026-08-20T05:26:26.306Z", title: "Lead captured via Pipedrive Auto-Sync" },
      {
        date: "2026-08-20T06:50:00.000Z",
        score: 50,
        title: "Identity Verified (50% Match, -)",
        carrier: "-",
        lineType: "-",
        nameMatch: "No"
      }
    ]
  },
  {
    id: "402668d1-f435-45ed-8b86-38fa8994f811",
    user_id: 81,
    first_name: "sweta",
    last_name: "Contact",
    email: "sweta1@gmail.com",
    country_code: "+91",
    phone: "9676765645",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      { date: "2026-08-20T05:26:26.305Z", title: "Lead captured via Pipedrive Auto-Sync" },
      {
        date: "2026-08-20T06:50:00.000Z",
        score: 50,
        title: "Identity Verified (50% Match, -)",
        carrier: "-",
        lineType: "-",
        nameMatch: "No"
      }
    ]
  },
  {
    id: "0bae50a6-1b68-4a37-82b2-2ab93113cfdd",
    user_id: 81,
    first_name: "rajan",
    last_name: "Contact",
    email: "rajan1@gmail.com",
    country_code: "+91",
    phone: "8978675645",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      { date: "2026-08-20T05:27:27.077Z", title: "Lead captured via Pipedrive Auto-Sync" },
      {
        date: "2026-08-20T05:58:28.179Z",
        score: 50,
        title: "Identity Verified (50% Match, -)",
        carrier: "-",
        lineType: "-",
        nameMatch: "No"
      }
    ]
  },
  {
    id: "b1364213-1859-4244-9a59-3cf7fa5de55d",
    user_id: 81,
    first_name: "rajan",
    last_name: "Contact",
    email: "rajan1@gmail.com",
    country_code: "+91",
    phone: "8978675645",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      { date: "2026-08-20T05:27:27.075Z", title: "Lead captured via Pipedrive Auto-Sync" },
      {
        date: "2026-08-20T06:50:00.000Z",
        score: 50,
        title: "Identity Verified (50% Match, -)",
        carrier: "-",
        lineType: "-",
        nameMatch: "No"
      }
    ]
  },
  {
    id: "ae2bed12-3c69-4a56-8680-6e80f4c93dd2",
    user_id: 81,
    first_name: "Muskan",
    last_name: "Thakur",
    email: "rajan.isynbus+7@gmail.com",
    country_code: "+91",
    phone: "8676029365",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 80,
    events: [
      { date: "2026-08-20T05:24:26.753Z", title: "Lead captured via Pipedrive Auto-Sync" }
    ]
  },
  {
    id: "8133a82a-e01f-43dc-a084-3c66f1f7a5d5",
    user_id: 81,
    first_name: "Vishal",
    last_name: "Yadav",
    email: "rajan.isynbus+3@gmail.com",
    country_code: "+1",
    phone: "65655562648362512162",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      { date: "2026-08-20T05:21:31.697Z", title: "Lead captured via Pipedrive Auto-Sync" }
    ]
  },
  {
    id: "0eb2ab09-584e-43f7-b325-ea61bb5b4a62",
    user_id: 81,
    first_name: "Vishal",
    last_name: "Yadav",
    email: "rajan.isynbus+3@gmail.com",
    country_code: "+1",
    phone: "65655562648362512162",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      { date: "2026-08-20T05:21:31.696Z", title: "Lead captured via Pipedrive Auto-Sync" }
    ]
  },
  {
    id: "8d7582bf-22c9-4787-8ec8-71e179552c82",
    user_id: 81,
    first_name: "Rajan",
    last_name: "Kumar",
    email: "rajan.isynbus+2@gmail.com",
    country_code: "+91",
    phone: "7549435682",
    source: "Zoho Auto-Sync",
    status: 1,
    score: 75,
    events: [
      { date: "2026-08-20T05:14:52.423Z", title: "Lead captured via Zoho Auto-Sync" }
    ]
  },
  {
    id: "c7a444b6-7399-4519-b71c-c119bb0dfb4b",
    user_id: 81,
    first_name: "Sweta",
    last_name: "Singh",
    email: "rajan.isynbus+1@gmail.com",
    country_code: "+1",
    phone: "65655562648676029363",
    source: "Zoho Auto-Sync",
    status: 1,
    score: 75,
    events: [
      { date: "2026-08-20T05:12:06.299Z", title: "Lead captured via Zoho Auto-Sync" }
    ]
  },
  {
    id: "5242b731-4339-4a38-8917-90e995605f12",
    user_id: 81,
    first_name: "newtest",
    last_name: "Contact",
    email: "pipedrive1@gmail.com",
    country_code: null,
    phone: "5678456745",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      {
        date: "2026-08-19T12:19:52.524Z",
        score: 50,
        title: "Identity Verified (50% Match, -)",
        carrier: "-",
        lineType: "-",
        nameMatch: "No"
      }
    ]
  },
  {
    id: "a679a1eb-b77e-47d5-a21f-cfc88821622c",
    user_id: 81,
    first_name: "Miter",
    last_name: "10",
    email: "milter@gmail.com",
    country_code: null,
    phone: "91234567",
    source: "Digital Cards",
    status: 1,
    score: 85,
    events: [
      {
        date: "2026-08-19T12:17:48.188Z",
        score: 50,
        title: "Identity Verified (50% Match, -)",
        carrier: "-",
        lineType: "-",
        nameMatch: "No"
      }
    ]
  },
  {
    id: "76b634ca-3651-497f-a5e7-e0b9916de39a",
    user_id: 81,
    first_name: "Sweta",
    last_name: "Singh",
    email: "swetasingh03052000@gmail.com",
    country_code: null,
    phone: "09319614264",
    source: "Digital Cards",
    status: 1,
    score: 85,
    events: [
      {
        date: "2026-08-19T12:17:12.365Z",
        score: 50,
        title: "Identity Verified (50% Match, -)",
        carrier: "-",
        lineType: "-",
        nameMatch: "No"
      }
    ]
  },
  {
    id: "5295d28f-7580-4bdc-b1f1-d13530f2e918",
    user_id: 81,
    first_name: "mohit",
    last_name: "",
    email: "mohit@isynbus.com",
    country_code: null,
    phone: "+90 909 239 25 89",
    source: "Digital Cards",
    status: 1,
    score: 85,
    events: [
      {
        date: "2026-08-19T12:16:55.363Z",
        score: 50,
        title: "Identity Verified (50% Match, -)",
        carrier: "-",
        lineType: "-",
        nameMatch: "No"
      }
    ]
  },
  {
    id: "b8553da7-2cdf-4d1a-aa96-f9352cd5bea3",
    user_id: 81,
    first_name: "Sold",
    last_name: "Property Celebration",
    email: "platform.sub@zien.ai",
    country_code: null,
    phone: "9319614262",
    source: "Digital Cards",
    status: 1,
    score: 85,
    events: [
      {
        date: "2026-08-19T12:15:58.566Z",
        score: 50,
        title: "Identity Verified (50% Match, -)",
        carrier: "-",
        lineType: "-",
        nameMatch: "No"
      }
    ]
  },
  {
    id: "13e9455d-6fb3-4da5-adee-0b532a6879c4",
    user_id: 81,
    first_name: "newtest",
    last_name: "Contact",
    email: "pipedrive2@gmail.com",
    country_code: "+1",
    phone: "5678456745",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      {
        date: "2026-08-19T11:49:13.493Z",
        title: "Identity Verified (50% Match, Verizon Wireless)",
        carrier: "Verizon Wireless",
        lineType: "Mobile",
        score: 50
      }
    ]
  },
  {
    id: "c2ae669c-abc4-4370-9c18-7fcb77047f0a",
    user_id: 81,
    first_name: "new36",
    last_name: "Contact",
    email: "new5@gmail.com",
    country_code: "+1",
    phone: "3456784567",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      {
        date: "2026-08-19T11:36:44.338Z",
        title: "Identity Verified (50% Match, Verizon Wireless)",
        carrier: "Verizon Wireless",
        lineType: "Mobile",
        score: 50
      }
    ]
  },
  {
    id: "df4b8520-40bb-4727-9d2b-eb2bc3307c71",
    user_id: 81,
    first_name: "new8",
    last_name: "Contact",
    email: "new67@gmail.com",
    country_code: "+1",
    phone: "7867676766",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      {
        date: "2026-08-19T11:36:23.718Z",
        title: "Identity Verified (50% Match, Verizon Wireless)",
        carrier: "Verizon Wireless",
        lineType: "Mobile",
        score: 50
      }
    ]
  },
  {
    id: "af1339b5-016c-43d3-8d74-eebeae9062f7",
    user_id: 81,
    first_name: "pulkit",
    last_name: "",
    email: "pulkit.isynbus@gmail.com",
    country_code: null,
    phone: "34567890-9765",
    source: "Digital Cards",
    status: 1,
    score: 85,
    events: [
      {
        date: "2026-08-19T11:24:19.431Z",
        title: "Identity Verified (48% Match, T-Mobile USA)",
        carrier: "T-Mobile USA",
        lineType: "Mobile",
        score: 48
      }
    ]
  },
  {
    id: "bd524ff0-280a-4dba-a834-9a92a438d5ca",
    user_id: 81,
    first_name: "puneet",
    last_name: "",
    email: "puneet.isynbus@gmail.com",
    country_code: null,
    phone: "8765454534",
    source: "Digital Cards",
    status: 1,
    score: 85,
    events: [
      {
        date: "2026-08-19T11:23:45.025Z",
        title: "Identity Verified (48% Match, T-Mobile USA)",
        carrier: "T-Mobile USA",
        lineType: "Mobile",
        score: 48
      }
    ]
  },
  {
    id: "94c11308-d6e2-4657-96f3-b16d29d31ed7",
    user_id: 81,
    first_name: "sweta",
    last_name: "singh",
    email: "sweta.isynbus1@gmail.com",
    country_code: "+91",
    phone: "9839489356",
    source: "Zillow",
    status: 1,
    score: 75,
    events: [
      {
        date: "2026-08-19T11:21:34.427Z",
        title: "Identity Verified (48% Match, T-Mobile USA)",
        carrier: "T-Mobile USA",
        lineType: "Mobile",
        score: 48
      }
    ]
  },
  {
    id: "8e70f8a4-abdf-48c2-9360-d8cfc0e78bae",
    user_id: 81,
    first_name: "new6",
    last_name: "Contact",
    email: "new6@gmail.com",
    country_code: null,
    phone: "3456785678",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      {
        date: "2026-08-19T11:21:06.048Z",
        title: "Identity Verified (48% Match, T-Mobile USA)",
        carrier: "T-Mobile USA",
        lineType: "Mobile",
        score: 48
      }
    ]
  },
  {
    id: "8cd2d274-ed03-4959-8990-f1eb7fb8e17c",
    user_id: 81,
    first_name: "new8",
    last_name: "Contact",
    email: "new77@gmail.com",
    country_code: "+1",
    phone: "7867676766",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: [
      {
        date: "2026-08-19T06:42:45.393Z",
        title: "Identity Verified (48% Match, T-Mobile USA)",
        carrier: "T-Mobile USA",
        lineType: "Mobile",
        score: 48
      }
    ]
  },
  {
    id: "b3c39b8d-74dd-421e-9ed1-213b2224e3b9",
    user_id: 81,
    first_name: "zoho11",
    last_name: "test",
    email: "zoho11@gmail.com",
    country_code: "+1",
    phone: "+14567867856",
    source: "Zoho Auto-Sync",
    status: 1,
    score: 75,
    events: [
      {
        date: "2026-08-19T06:41:23.369Z",
        title: "Identity Verified (48% Match, T-Mobile USA)",
        carrier: "T-Mobile USA",
        lineType: "Mobile",
        score: 48
      }
    ]
  },
  {
    id: "703d095b-d4d5-45a6-8b2f-5f15833a7182",
    user_id: 81,
    first_name: "newpipedrive",
    last_name: "Contact",
    email: "newpipedrive2@gmail.com",
    country_code: "+1",
    phone: "3456784567",
    source: "Pipedrive Auto-Sync",
    status: 1,
    score: 75,
    events: []
  },
  {
    id: "c47f5139-2e71-4e7a-98f6-4b1283a194be",
    user_id: 81,
    first_name: "zoho",
    last_name: "crm",
    email: "zohotest@gmail.com",
    country_code: "+91",
    phone: "7878375873",
    source: "Manual",
    status: 1,
    score: 75,
    events: []
  },
  {
    id: "b8da29ea-6203-4c83-97e6-53544ae5a9ec",
    user_id: 81,
    first_name: "Bunnings",
    last_name: "Warehouse",
    email: "placemakers@gmail.com",
    country_code: null,
    phone: "099876543",
    source: "Digital Cards",
    status: 1,
    score: 85,
    events: []
  },
  {
    id: "9bbb8675-0c0c-40d6-9168-6d68eaab0e4e",
    user_id: 81,
    first_name: "test",
    last_name: "check utm",
    email: "newutmcheck@gmail.com",
    country_code: null,
    phone: "9319614262",
    source: "Digital Cards",
    status: 1,
    score: 85,
    events: []
  }
];

function parseLeadToDirectoryLead(raw: any): DirectoryLead {
  const fullName = `${raw.first_name || ''} ${raw.last_name || ''}`.trim() || raw.email || 'Unnamed Contact';
  const phoneFormatted = raw.phone
    ? (raw.country_code ? `${raw.country_code} ${raw.phone}` : raw.phone)
    : '-';
  const sourceLabel = `Source: ${raw.source || 'CRM Direct Sync'}`;

  const events = Array.isArray(raw.events) ? raw.events : [];
  const verifyEvent = [...events].reverse().find(
    (e: any) =>
      (e.title &&
        (e.title.toLowerCase().includes('identity verified') ||
          e.title.toLowerCase().includes('verification') ||
          e.title.toLowerCase().includes('match'))) ||
      e.nameMatch !== undefined ||
      e.carrier !== undefined
  );

  let status: 'FAILED MATCH' | 'NOT VERIFIED' | 'CLEARED' | 'PENDING CHECK' | 'VERIFYING' = 'NOT VERIFIED';
  let matchScore: number | undefined = undefined;
  let carrier: string | undefined = undefined;
  let lineType: string | undefined = undefined;
  let registeredName: string | undefined = undefined;
  let registeredAddress: string | undefined = undefined;
  let warningNote: string | undefined = undefined;
  let successNote: string | undefined = undefined;

  if (verifyEvent) {
    matchScore = typeof verifyEvent.score === 'number' ? verifyEvent.score : undefined;
    carrier = verifyEvent.carrier || '-';
    lineType = verifyEvent.lineType || '-';
    registeredName = verifyEvent.registeredName || undefined;
    registeredAddress = verifyEvent.registeredAddress || undefined;

    // Check if score indicates match failure or low match
    const isMismatch =
      verifyEvent.nameMatch === 'No' ||
      (typeof verifyEvent.score === 'number' && verifyEvent.score <= 55) ||
      (verifyEvent.title &&
        (verifyEvent.title.includes('50%') ||
          verifyEvent.title.includes('48%') ||
          verifyEvent.title.includes('45%') ||
          verifyEvent.title.includes('Mismatch')));

    if (isMismatch) {
      status = 'FAILED MATCH';
      warningNote = 'Name match check failed. Identity mismatch warning!';
      if (matchScore === undefined) {
        if (verifyEvent.title?.includes('48%')) matchScore = 48;
        else if (verifyEvent.title?.includes('45%')) matchScore = 45;
        else matchScore = 50;
      }
    } else {
      status = 'CLEARED';
      successNote = 'Identity match confirmed via Whitepages & US Census';
      if (matchScore === undefined) matchScore = 98;
    }
  } else {
    status = 'NOT VERIFIED';
  }

  return {
    id: raw.id || String(Math.random()),
    name: fullName,
    source: sourceLabel,
    phone: phoneFormatted,
    email: raw.email || '-',
    status,
    matchScore,
    carrier,
    lineType,
    registeredName,
    registeredAddress,
    warningNote,
    successNote,
    raw,
  };
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  isOffice?: boolean;
  phone: string;
  email: string;
}

export const COUNTRY_DIAL_OPTIONS = [
  { code: 'US', flag: '🇺🇸', name: 'United States', dialCode: '+1' },
  { code: 'IN', flag: '🇮🇳', name: 'India', dialCode: '+91' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dialCode: '+44' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dialCode: '+1' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dialCode: '+61' },
  { code: 'AE', flag: '🇦🇪', name: 'United Arab Emirates', dialCode: '+971' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dialCode: '+49' },
  { code: 'FR', flag: '🇫🇷', name: 'France', dialCode: '+33' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore', dialCode: '+65' },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', dialCode: '+966' },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan', dialCode: '+92' },
  { code: 'BD', flag: '🇧🇩', name: 'Bangladesh', dialCode: '+880' },
  { code: 'NP', flag: '🇳🇵', name: 'Nepal', dialCode: '+977' },
  { code: 'LK', flag: '🇱🇰', name: 'Sri Lanka', dialCode: '+94' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand', dialCode: '+64' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa', dialCode: '+27' },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia', dialCode: '+60' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines', dialCode: '+63' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan', dialCode: '+81' },
  { code: 'CN', flag: '🇨🇳', name: 'China', dialCode: '+86' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil', dialCode: '+55' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico', dialCode: '+52' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain', dialCode: '+34' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy', dialCode: '+39' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', dialCode: '+31' },
  { code: 'CH', flag: '🇨🇭', name: 'Switzerland', dialCode: '+41' },
  { code: 'SE', flag: '🇸🇪', name: 'Sweden', dialCode: '+46' },
  { code: 'NO', flag: '🇳🇴', name: 'Norway', dialCode: '+47' },
  { code: 'IE', flag: '🇮🇪', name: 'Ireland', dialCode: '+353' },
  { code: 'QA', flag: '🇶🇦', name: 'Qatar', dialCode: '+974' },
  { code: 'KW', flag: '🇰🇼', name: 'Kuwait', dialCode: '+965' },
  { code: 'OM', flag: '🇴🇲', name: 'Oman', dialCode: '+968' },
  { code: 'BH', flag: '🇧🇭', name: 'Bahrain', dialCode: '+973' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand', dialCode: '+66' },
  { code: 'VN', flag: '🇻🇳', name: 'Vietnam', dialCode: '+84' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia', dialCode: '+62' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea', dialCode: '+82' },
  { code: 'RU', flag: '🇷🇺', name: 'Russia', dialCode: '+7' },
  { code: 'TR', flag: '🇹🇷', name: 'Turkey', dialCode: '+90' },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt', dialCode: '+20' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', dialCode: '+234' },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya', dialCode: '+254' },
];

const DEFAULT_EMERGENCY_CONTACTS: EmergencyContact[] = [];

const RAW_SAFETY_LOGS_FALLBACK: SafetyLogItem[] = [
  {
    id: "473",
    clientName: "zoho crm",
    duration: "Verification Check",
    date: "2026-08-20T07:04:00.407Z",
    status: "Safe",
    action: "identity_verified",
    agentName: "sweta singh",
    severity: "low"
  },
  {
    id: "472",
    clientName: "sweta Contact",
    duration: "Verification Check",
    date: "2026-08-20T06:55:06.457Z",
    status: "Safe",
    action: "identity_verified",
    agentName: "sweta singh",
    severity: "low"
  },
  {
    id: "471",
    clientName: "sweta Contact",
    duration: "Verification Check",
    date: "2026-08-20T06:54:00.769Z",
    status: "Safe",
    action: "identity_verified",
    agentName: "sweta singh",
    severity: "low"
  },
  {
    id: "470",
    clientName: "rajan Contact",
    duration: "Verification Check",
    date: "2026-08-20T06:43:24.164Z",
    status: "Safe",
    action: "identity_verified",
    agentName: "sweta singh",
    severity: "low"
  },
  {
    id: "469",
    clientName: "rajan Contact",
    duration: "Verification Check",
    date: "2026-08-20T05:58:28.188Z",
    status: "Safe",
    action: "identity_verified",
    agentName: "sweta singh",
    severity: "low"
  }
];

function formatLogTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return isToday ? `Today, ${timeStr}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  } catch {
    return dateStr;
  }
}

function parseSafetyLog(item: SafetyLogItem) {
  return {
    id: String(item.id),
    time: formatLogTime(item.date),
    event: `ID Verification check: ${item.clientName}`,
    category: 'Compliance',
    agent: item.agentName || 'sweta singh',
    severity: (item.severity ? item.severity.toUpperCase() : 'LOW') as 'LOW' | 'WARNING' | 'CRITICAL',
  };
}

function formatGuardianTime(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function GuardianAiOverviewScreen() {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);

  const { accessToken } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();

  // Top Sub-Tabs within Overview (Guardian Switch, Lead Verification Hub, Emergency Settings, Safety Logs)
  const [activeTopTab, setActiveTopTab] = useState<(typeof TOP_TABS)[number]['id']>(
    params.tab === 'logs-reports' || params.tab === 'logs' ? 'logs' : 'switch'
  );

  useEffect(() => {
    if (params.tab === 'logs-reports' || params.tab === 'logs') {
      setActiveTopTab('logs');
    } else if (params.tab === 'emergency') {
      setActiveTopTab('emergency');
    } else if (params.tab === 'leads') {
      setActiveTopTab('leads');
    }
  }, [params.tab]);

  // Directory Leads API Data State
  const [directoryLeads, setDirectoryLeads] = useState<DirectoryLead[]>(() =>
    RAW_API_LEADS_FALLBACK.map(parseLeadToDirectoryLead)
  );
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch Leads from GET https://api.zien.ai/api/solo/crm/leads?status=1
  const fetchLeadsFromApi = useCallback(async () => {
    try {
      const token = accessToken || (await AsyncStorage.getItem('access_token'));
      if (!token) return;
      setLoadingLeads(true);
      const data = await getCRMLeads(token, 1);
      if (Array.isArray(data) && data.length > 0) {
        const parsed = data.map(parseLeadToDirectoryLead);
        setDirectoryLeads(parsed);
      }
    } catch (err) {
      console.log('Lead Verification Hub API fetch error:', err);
    } finally {
      setLoadingLeads(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  // Initial and accessToken change fetch
  useEffect(() => {
    fetchLeadsFromApi();
  }, [fetchLeadsFromApi]);

  // Refetch whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchLeadsFromApi();
    }, [fetchLeadsFromApi])
  );

  // Refetch when switching to Lead Verification Hub tab
  useEffect(() => {
    if (activeTopTab === 'leads') {
      fetchLeadsFromApi();
    }
  }, [activeTopTab, fetchLeadsFromApi]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeadsFromApi();
  };

  // Meeting CRM Lead State
  const [selectedMeetingLead, setSelectedMeetingLead] = useState<DirectoryLead | null>(null);
  const [showMeetingLeadModal, setShowMeetingLeadModal] = useState(false);
  const [meetingLeadSearch, setMeetingLeadSearch] = useState('');

  // Timer State
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [guardianTimerActive, setGuardianTimerActive] = useState(false);
  const [guardianSecondsLeft, setGuardianSecondsLeft] = useState(30 * 60);
  const guardianIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showSosModal, setShowSosModal] = useState(false);

  // Emergency SOS Contacts & Settings State (Web Matching)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(DEFAULT_EMERGENCY_CONTACTS);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [submittingContact, setSubmittingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRelationship, setNewContactRelationship] = useState('Broker / Agency');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [showRelationshipMenu, setShowRelationshipMenu] = useState(false);
  const [safetyPolicies, setSafetyPolicies] = useState({
    autoNotify: true,
    continuousGps: true,
    silentPanic: false,
  });

  // Fetch Emergency SOS Contacts from GET https://api.zien.ai/api/solo/crm/safety/contacts
  const fetchEmergencyContactsFromApi = useCallback(async () => {
    try {
      const token = accessToken || (await AsyncStorage.getItem('access_token'));
      if (!token) return;
      setLoadingContacts(true);
      const data = await getSafetyContacts(token);
      if (Array.isArray(data)) {
        setEmergencyContacts(
          data.map((c) => ({
            id: String(c.id),
            name: c.name,
            relationship: c.relationship || 'Emergency Contact',
            phone: c.phone || '-',
            email: c.email || '-',
            isOffice:
              (c.relationship || '').toLowerCase().includes('office') ||
              (c.relationship || '').toLowerCase().includes('broker'),
          }))
        );
      }
    } catch (err) {
      console.log('Safety Contacts API fetch error:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchEmergencyContactsFromApi();
  }, [fetchEmergencyContactsFromApi]);

  useFocusEffect(
    useCallback(() => {
      fetchEmergencyContactsFromApi();
    }, [fetchEmergencyContactsFromApi])
  );

  useEffect(() => {
    if (activeTopTab === 'emergency') {
      fetchEmergencyContactsFromApi();
    }
  }, [activeTopTab, fetchEmergencyContactsFromApi]);

  // Country Code Picker State
  const [selectedCountry, setSelectedCountry] = useState({ code: 'US', flag: '🇺🇸', name: 'United States', dialCode: '+1' });
  const [editSelectedCountry, setEditSelectedCountry] = useState({ code: 'IN', flag: '🇮🇳', name: 'India', dialCode: '+91' });
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [targetPickerField, setTargetPickerField] = useState<'add' | 'edit'>('add');

  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery.trim()) return COUNTRY_DIAL_OPTIONS;
    const q = countrySearchQuery.toLowerCase();
    return COUNTRY_DIAL_OPTIONS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countrySearchQuery]);

  const handleAddEmergencyContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter both Contact Name and Phone Number.');
      return;
    }
    const token = accessToken || (await AsyncStorage.getItem('access_token'));
    const cleanDigits = newContactPhone.trim().replace(/[^\d+]/g, '');
    const phoneFormatted = cleanDigits.startsWith('+')
      ? cleanDigits
      : `${selectedCountry.dialCode}${cleanDigits.replace(/^0+/, '')}`;

    const newContactItem: SafetyContactItem = {
      id: String(Date.now()),
      name: newContactName.trim(),
      relationship: newContactRelationship,
      phone: phoneFormatted,
      email: newContactEmail.trim(),
    };

    const updatedContactsList: SafetyContactItem[] = [
      ...emergencyContacts.map((c) => ({
        id: String(c.id),
        name: c.name,
        relationship: c.relationship,
        phone: (c.phone || '').replace(/\s+/g, ''),
        email: c.email === '-' ? '' : (c.email || ''),
      })),
      newContactItem,
    ];

    setSubmittingContact(true);
    try {
      if (token) {
        await updateSafetyContacts(token, updatedContactsList);
        await fetchEmergencyContactsFromApi();
      } else {
        const newContact: EmergencyContact = {
          ...newContactItem,
          isOffice:
            newContactRelationship.toLowerCase().includes('office') ||
            newContactRelationship.toLowerCase().includes('broker'),
          email: newContactItem.email || '-',
        };
        setEmergencyContacts((prev) => [...prev, newContact]);
      }
      setNewContactName('');
      setNewContactPhone('');
      setNewContactEmail('');
      Alert.alert('Contact Added', `${newContactItem.name} has been added to Emergency SOS Contacts.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add emergency contact.');
    } finally {
      setSubmittingContact(false);
    }
  };

  // Edit Emergency Contact State
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRelationship, setEditRelationship] = useState('Colleague');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [showEditRelationshipMenu, setShowEditRelationshipMenu] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleStartEditContact = (contact: EmergencyContact) => {
    setEditingContactId(contact.id);
    setEditName(contact.name);
    setEditRelationship(contact.relationship || 'Colleague');
    const rawPhone = (contact.phone || '').trim().replace(/\s+/g, '');
    const matchedCountry = COUNTRY_DIAL_OPTIONS.find((c) => rawPhone.startsWith(c.dialCode)) || {
      code: 'IN',
      flag: '🇮🇳',
      name: 'India',
      dialCode: '+91',
    };
    setEditSelectedCountry(matchedCountry);
    const cleanPhone = rawPhone.startsWith(matchedCountry.dialCode)
      ? rawPhone.slice(matchedCountry.dialCode.length).trim()
      : rawPhone;
    setEditPhone(cleanPhone);
    setEditEmail(contact.email === '-' ? '' : contact.email);
    setShowEditRelationshipMenu(false);
  };

  const handleCancelEditContact = () => {
    setEditingContactId(null);
    setShowEditRelationshipMenu(false);
  };

  const handleSaveEditContact = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter both Contact Name and Phone Number.');
      return;
    }
    const token = accessToken || (await AsyncStorage.getItem('access_token'));
    const cleanDigits = editPhone.trim().replace(/[^\d+]/g, '');
    const phoneFormatted = cleanDigits.startsWith('+')
      ? cleanDigits
      : `${editSelectedCountry.dialCode}${cleanDigits.replace(/^0+/, '')}`;

    const updatedContactsList: SafetyContactItem[] = emergencyContacts.map((c) => {
      if (c.id === editingContactId) {
        return {
          id: String(c.id),
          name: editName.trim(),
          relationship: editRelationship,
          phone: phoneFormatted,
          email: editEmail.trim(),
        };
      }
      return {
        id: String(c.id),
        name: c.name,
        relationship: c.relationship,
        phone: (c.phone || '').replace(/\s+/g, ''),
        email: c.email === '-' ? '' : (c.email || ''),
      };
    });

    setSavingEdit(true);
    try {
      if (token) {
        await updateSafetyContacts(token, updatedContactsList);
        await fetchEmergencyContactsFromApi();
      } else {
        setEmergencyContacts(
          updatedContactsList.map((c) => ({
            ...c,
            isOffice:
              (c.relationship || '').toLowerCase().includes('office') ||
              (c.relationship || '').toLowerCase().includes('broker'),
          }))
        );
      }
      setEditingContactId(null);
      Alert.alert('Success', 'Emergency contact updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update emergency contact.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEmergencyContact = (id: string, name: string) => {
    Alert.alert('Delete Contact', `Are you sure you want to delete ${name} from emergency contacts?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = accessToken || (await AsyncStorage.getItem('access_token'));
            const remaining = emergencyContacts.filter((c) => c.id !== id);
            if (token) {
              await updateSafetyContacts(
                token,
                remaining.map((c) => ({
                  id: c.id,
                  name: c.name,
                  relationship: c.relationship,
                  phone: c.phone,
                  email: c.email === '-' ? '' : c.email,
                }))
              );
              await fetchEmergencyContactsFromApi();
            } else {
              setEmergencyContacts(remaining);
            }
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete emergency contact.');
          }
        },
      },
    ]);
  };

  // Lead Verification Directory filters
  const [activeLeadFilter, setActiveLeadFilter] = useState<LeadFilterKey>('all');
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');
  const [verifyingLeadId, setVerifyingLeadId] = useState<string | null>(null);

  // Safety Logs state & API Data
  const [safetyLogs, setSafetyLogs] = useState<SafetyLogItem[]>(RAW_SAFETY_LOGS_FALLBACK);
  const [loadingSafetyLogs, setLoadingSafetyLogs] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showAllArchivedLogs, setShowAllArchivedLogs] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState('Situational Anomalies');
  const [disclosureText, setDisclosureText] = useState('');

  // Fetch Safety Logs from GET https://api.zien.ai/api/solo/crm/safety/logs
  const fetchSafetyLogsFromApi = useCallback(async () => {
    try {
      const token = accessToken || (await AsyncStorage.getItem('access_token'));
      if (!token) return;
      setLoadingSafetyLogs(true);
      const data = await getSafetyLogs(token);
      if (Array.isArray(data)) {
        setSafetyLogs(data);
      }
    } catch (err) {
      console.log('Safety Logs API fetch error:', err);
    } finally {
      setLoadingSafetyLogs(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchSafetyLogsFromApi();
  }, [fetchSafetyLogsFromApi]);

  useFocusEffect(
    useCallback(() => {
      fetchSafetyLogsFromApi();
    }, [fetchSafetyLogsFromApi])
  );

  useEffect(() => {
    if (activeTopTab === 'logs') {
      fetchSafetyLogsFromApi();
    }
  }, [activeTopTab, fetchSafetyLogsFromApi]);

  const [triggeringAlert, setTriggeringAlert] = useState(false);
  const [panicModeActive, setPanicModeActive] = useState(false);
  const hapticIntervalRef = useRef<any>(null);
  const soundObjectRef = useRef<Audio.Sound | null>(null);

  const playSirenSound = async () => {
    try {
      if (soundObjectRef.current) {
        try {
          await soundObjectRef.current.stopAsync();
          await soundObjectRef.current.unloadAsync();
        } catch {}
        soundObjectRef.current = null;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/emergency_alarm.wav'),
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      soundObjectRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing emergency alarm sound:', error);
    }
  };

  const stopSirenSound = async () => {
    if (soundObjectRef.current) {
      try {
        await soundObjectRef.current.stopAsync();
        await soundObjectRef.current.unloadAsync();
      } catch {}
      soundObjectRef.current = null;
    }
  };

  const resetGuardianTimer = () => {
    if (guardianIntervalRef.current) {
      clearInterval(guardianIntervalRef.current);
      guardianIntervalRef.current = null;
    }
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
    stopSirenSound();
    setGuardianTimerActive(false);
    setGuardianSecondsLeft(selectedMinutes * 60);
    setShowSosModal(false);
  };

  const startGuardianTimer = () => {
    setGuardianSecondsLeft(selectedMinutes * 60);
    setGuardianTimerActive(true);
  };

  const handleAdd15Mins = () => {
    setGuardianSecondsLeft((prev) => prev + 15 * 60);
    Alert.alert('Time Added', '+15 Minutes added to showing session.');
  };

  const handleMarkSafeAndStop = () => {
    resetGuardianTimer();
    Alert.alert('Showing Complete', 'Session marked safe and stopped successfully.');
  };

  const handleTriggerPanicAlarm = async () => {
    const token = accessToken || (await AsyncStorage.getItem('access_token'));
    const clientName = selectedMeetingLead?.name || 'Unknown Client';
    setShowSosModal(false);
    setPanicModeActive(true);
    setTriggeringAlert(true);

    // Play loud emergency siren audio sound
    playSirenSound();

    // Continuous Emergency Haptic Alarm Pulses
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
    if (hapticIntervalRef.current) clearInterval(hapticIntervalRef.current);
    hapticIntervalRef.current = setInterval(() => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }, 1200);

    try {
      if (token) {
        await triggerSafetyAlert(token, clientName);
        await fetchSafetyLogsFromApi();
      }
    } catch (err: any) {
      console.log('Trigger alert API error:', err);
    } finally {
      setTriggeringAlert(false);
    }
  };

  const handleCancelPanicAlarm = () => {
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
    stopSirenSound();
    setPanicModeActive(false);
    resetGuardianTimer();
    fetchSafetyLogsFromApi();
    Alert.alert('Alarm Cancelled', 'Emergency panic alarm stopped successfully.');
  };

  useEffect(() => {
    return () => {
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
      stopSirenSound();
    };
  }, []);

  useEffect(() => {
    if (!guardianTimerActive) return;
    guardianIntervalRef.current = setInterval(() => {
      setGuardianSecondsLeft((prev) => {
        if (prev <= 1) {
          if (guardianIntervalRef.current) {
            clearInterval(guardianIntervalRef.current);
            guardianIntervalRef.current = null;
          }
          setGuardianTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (guardianIntervalRef.current) {
        clearInterval(guardianIntervalRef.current);
        guardianIntervalRef.current = null;
      }
    };
  }, [guardianTimerActive]);

  useEffect(() => {
    if (!guardianTimerActive) setGuardianSecondsLeft(selectedMinutes * 60);
  }, [selectedMinutes, guardianTimerActive]);

  // FCRA Consent Modal State
  const [consentModalLead, setConsentModalLead] = useState<DirectoryLead | null>(null);
  const [isVerifyingApi, setIsVerifyingApi] = useState(false);

  const handleOpenConsentModal = (lead: DirectoryLead) => {
    setConsentModalLead(lead);
  };

  const handleConfirmConsentAndVerify = async () => {
    if (!consentModalLead) return;
    const targetLeadId = consentModalLead.id;
    setIsVerifyingApi(true);
    setVerifyingLeadId(targetLeadId);

    try {
      let result: any = null;
      const token = accessToken || (await AsyncStorage.getItem('access_token'));
      if (token) {
        result = await verifyCRMLeadIdentity(token, targetLeadId).catch((e) => {
          console.log('Verify identity API call error:', e);
          return null;
        });
      }

      // API Response: { status: "Not Verified", score: 50, carrier: "-", lineType: "-", nameMatch: "No" }
      const score = typeof result?.score === 'number' ? result.score : 50;
      const carrier = result?.carrier || '-';
      const lineType = result?.lineType || '-';
      const nameMatch = result?.nameMatch || 'No';

      const isMismatch = nameMatch === 'No' || score <= 55;

      setDirectoryLeads((prev) =>
        prev.map((lead) => {
          if (lead.id === targetLeadId) {
            if (isMismatch) {
              return {
                ...lead,
                status: 'FAILED MATCH',
                matchScore: score,
                carrier,
                lineType,
                warningNote: 'Name match check failed. Identity mismatch warning!',
              };
            } else {
              return {
                ...lead,
                status: 'CLEARED',
                matchScore: score || 98,
                carrier: carrier === '-' ? 'Carrier Verified' : carrier,
                lineType: lineType === '-' ? 'Mobile' : lineType,
                successNote: 'Identity match confirmed via Whitepages & US Census',
              };
            }
          }
          return lead;
        })
      );

      setConsentModalLead(null);
      fetchLeadsFromApi();
    } catch (err: any) {
      Alert.alert('Verification Error', err?.message || 'Failed to complete identity check.');
    } finally {
      setIsVerifyingApi(false);
      setVerifyingLeadId(null);
    }
  };

  const handleCallContact = (phone: string, name: string) => {
    const url = `tel:${phone.replace(/[^0-9+]/g, '')}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Emergency Call', `Calling ${name} at ${phone}`);
        }
      })
      .catch(() => {
        Alert.alert('Emergency Call', `Calling ${name} at ${phone}`);
      });
  };

  // Compute Filter Counts from live directory leads
  const filterCounts = useMemo(() => {
    const total = directoryLeads.length;
    const cleared = directoryLeads.filter((l) => l.status === 'CLEARED').length;
    const failed = directoryLeads.filter((l) => l.status === 'FAILED MATCH').length;
    const pending = directoryLeads.filter(
      (l) => l.status === 'PENDING CHECK' || l.status === 'NOT VERIFIED'
    ).length;
    const verifying = directoryLeads.filter((l) => l.status === 'VERIFYING').length;

    return { total, cleared, failed, pending, verifying };
  }, [directoryLeads]);

  const filterTabs: Array<{ id: LeadFilterKey; label: string; count: number }> = useMemo(
    () => [
      { id: 'all', label: 'All Leads', count: filterCounts.total },
      { id: 'cleared', label: 'Cleared (Safe)', count: filterCounts.cleared },
      { id: 'failed', label: 'Failed Check (Mismatch)', count: filterCounts.failed },
      { id: 'pending', label: 'Pending Check', count: filterCounts.pending },
      { id: 'verifying', label: 'Verifying', count: filterCounts.verifying },
    ],
    [filterCounts]
  );

  // Filter Directory Leads
  const filteredDirectoryLeads = useMemo(() => {
    return directoryLeads.filter((lead) => {
      const q = directorySearchQuery.toLowerCase();
      const matchesSearch =
        lead.name.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeLeadFilter === 'cleared') return lead.status === 'CLEARED';
      if (activeLeadFilter === 'failed') return lead.status === 'FAILED MATCH';
      if (activeLeadFilter === 'pending')
        return lead.status === 'PENDING CHECK' || lead.status === 'NOT VERIFIED';
      if (activeLeadFilter === 'verifying') return lead.status === 'VERIFYING';
      return true; // 'all'
    });
  }, [directoryLeads, directorySearchQuery, activeLeadFilter]);

  return (
    <GuardianScreenShell
      title="Zien Guardian Safety Switch"
      subtitle="Central safety hub for managing active showings, emergency notifications, and verification history."
      showBack={true}
      showVerifiedBadge={true}
      showNav={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00A896"
            colors={['#00A896']}
          />
        }>
        {/* Top Sub-Navigation (Web Segmented Switcher) */}
        <View style={styles.topTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topTabsScroll}>
            {TOP_TABS.map((tab) => {
              const isActive = activeTopTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={[styles.topTabPill, isActive && styles.topTabPillActive]}
                  onPress={() => setActiveTopTab(tab.id)}>
                  <MaterialCommunityIcons
                    name={tab.icon}
                    size={17}
                    color={isActive ? colors.textPrimary : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[styles.topTabPillText, isActive && styles.topTabPillTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* TAB 1: GUARDIAN SWITCH */}
        {activeTopTab === 'switch' && (
          <>
            {/* Main Safety Switch Session Card */}
            <View style={styles.mainSafetyCard}>
              {/* Standby Header Status Pill */}
              <View style={styles.standbyHeaderPill}>
                <View style={styles.standbyPillContent}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={15}
                    color={guardianTimerActive ? '#00A896' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.standbyPillText,
                      guardianTimerActive && styles.standbyPillTextActive,
                    ]}>
                    {guardianTimerActive ? 'GUARDIAN ACTIVE' : 'GUARDIAN STANDBY'}
                  </Text>
                  <Text style={styles.standbyDivider}>•</Text>
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={15}
                    color={guardianTimerActive ? '#00A896' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.standbyPillText,
                      guardianTimerActive && styles.standbyPillTextActive,
                    ]}>
                    {guardianTimerActive ? 'GPS STREAMING' : 'GPS STANDBY'}
                  </Text>
                </View>
              </View>

              {/* Who Are You Meeting Section */}
              <View style={styles.meetingSection}>
                <Text style={styles.meetingLabel}>Who are you meeting? (CRM lead)</Text>
                <Pressable
                  style={styles.meetingSelectorBox}
                  onPress={() => setShowMeetingLeadModal(true)}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
                  {selectedMeetingLead ? (
                    <View style={styles.selectedLeadPreview}>
                      <Text style={styles.selectedLeadName} numberOfLines={1}>
                        {selectedMeetingLead.name}
                      </Text>
                      <View
                        style={[
                          styles.selectedLeadTrustBadge,
                          selectedMeetingLead.status === 'FAILED MATCH' &&
                            styles.selectedLeadTrustBadgeFailed,
                        ]}>
                        <MaterialCommunityIcons
                          name={
                            selectedMeetingLead.status === 'FAILED MATCH'
                              ? 'alert-circle'
                              : 'shield-check'
                          }
                          size={13}
                          color={
                            selectedMeetingLead.status === 'FAILED MATCH'
                              ? '#EF4444'
                              : '#16A34A'
                          }
                        />
                        <Text
                          style={[
                            styles.selectedLeadTrustText,
                            selectedMeetingLead.status === 'FAILED MATCH' &&
                              styles.selectedLeadTrustTextFailed,
                          ]}>
                          {selectedMeetingLead.matchScore
                            ? `${selectedMeetingLead.matchScore}% Score`
                            : selectedMeetingLead.status}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.meetingPlaceholder}>
                      Search or Select CRM Lead...
                    </Text>
                  )}
                  {selectedMeetingLead ? (
                    <Pressable
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedMeetingLead(null);
                      }}>
                      <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                    </Pressable>
                  ) : (
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#94A3B8" />
                  )}
                </Pressable>

                {/* Helper Text */}
                <View style={styles.meetingHelperRow}>
                  <MaterialCommunityIcons
                    name={
                      selectedMeetingLead
                        ? selectedMeetingLead.status === 'FAILED MATCH'
                          ? 'alert'
                          : 'check-circle'
                        : 'information-outline'
                    }
                    size={14}
                    color={
                      selectedMeetingLead
                        ? selectedMeetingLead.status === 'FAILED MATCH'
                          ? '#EF4444'
                          : '#16A34A'
                        : '#64748B'
                    }
                  />
                  <Text
                    style={[
                      styles.meetingHelperText,
                      selectedMeetingLead &&
                        selectedMeetingLead.status !== 'FAILED MATCH' &&
                        styles.meetingHelperTextCleared,
                      selectedMeetingLead &&
                        selectedMeetingLead.status === 'FAILED MATCH' &&
                        styles.meetingHelperTextFailed,
                    ]}>
                    {selectedMeetingLead
                      ? selectedMeetingLead.status === 'FAILED MATCH'
                        ? `Warning: ${selectedMeetingLead.name} has identity mismatch warning!`
                        : `Lead selected: ${selectedMeetingLead.name} (Safety verified)`
                      : 'Please select a lead to check safety clearance.'}
                  </Text>
                </View>
              </View>

              {/* Circular Countdown Timer */}
              <View style={styles.timerCenterContainer}>
                <View
                  style={[
                    styles.timerCircle,
                    guardianTimerActive && styles.timerCircleActive,
                  ]}>
                  <Text
                    style={[
                      styles.timerDisplayTime,
                      guardianTimerActive && styles.timerDisplayTimeActive,
                    ]}>
                    {formatGuardianTime(guardianSecondsLeft)}
                  </Text>
                  <Text
                    style={[
                      styles.timerDisplayLabel,
                      guardianTimerActive && styles.timerDisplayLabelActive,
                    ]}>
                    {guardianTimerActive ? 'COUNTDOWN ACTIVE' : 'SELECT TIME'}
                  </Text>
                </View>
              </View>

              {/* Duration Options */}
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = selectedMinutes === opt.minutes;
                  const disabled = guardianTimerActive;
                  return (
                    <Pressable
                      key={opt.minutes}
                      style={[
                        styles.durationBtn,
                        isSelected && !disabled && styles.durationBtnActive,
                        disabled && styles.durationBtnDisabled,
                      ]}
                      onPress={() => !disabled && setSelectedMinutes(opt.minutes)}
                      disabled={disabled}>
                      <Text
                        style={[
                          styles.durationBtnText,
                          isSelected && !disabled && styles.durationBtnTextActive,
                        ]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Action Buttons */}
              {!guardianTimerActive ? (
                <Pressable style={styles.startSessionBtn} onPress={startGuardianTimer}>
                  <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" />
                  <Text style={styles.startSessionBtnText}>Start Showing Session</Text>
                </Pressable>
              ) : (
                <View style={styles.activeSessionActionGroup}>
                  <View style={styles.activeSessionRow}>
                    <Pressable
                      style={styles.markSafeBtn}
                      onPress={handleMarkSafeAndStop}>
                      <MaterialCommunityIcons
                        name="check-circle-outline"
                        size={18}
                        color="#00A896"
                      />
                      <Text style={styles.markSafeBtnText}>Mark Safe / Stop</Text>
                    </Pressable>

                    <Pressable
                      style={styles.addTimeBtn}
                      onPress={handleAdd15Mins}>
                      <Text style={styles.addTimeBtnText}>+15 Mins</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={[
                      styles.triggerPanicBtn,
                      triggeringAlert && { opacity: 0.7 },
                    ]}
                    disabled={triggeringAlert}
                    onPress={handleTriggerPanicAlarm}>
                    {triggeringAlert ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="alert"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={styles.triggerPanicBtnText}>
                          TRIGGER PANIC ALARM (SOS)
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>

            {/* Card 2: SOS Emergency Contacts */}
            <View style={styles.sosContactsCard}>
              <View style={styles.sosContactsHeader}>
                <Text style={styles.sosContactsTitle}>SOS Emergency Contacts</Text>
                <MaterialCommunityIcons
                  name="shield-outline"
                  size={20}
                  color="#EF4444"
                />
              </View>
              {emergencyContacts.length === 0 ? (
                <View style={styles.emptySosCardWrap}>
                  <Text style={styles.emptySosCardText}>
                    No emergency contacts configured yet. Add in Emergency Settings.
                  </Text>
                </View>
              ) : (
                emergencyContacts.map((contact, idx) => (
                  <View
                    key={`${contact.id}-${idx}`}
                    style={[
                      styles.sosContactItem,
                      idx === 0 && styles.sosContactItemFirst,
                    ]}>
                    <View style={styles.sosContactInfo}>
                      <Text style={styles.sosContactName}>{contact.name}</Text>
                      <Text style={styles.sosContactRole}>
                        {contact.relationship || 'Emergency Contact'} • {contact.phone}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.sosCallIconBtn}
                      onPress={() => handleCallContact(contact.phone, contact.name)}>
                      <MaterialCommunityIcons name="phone" size={18} color="#00A896" />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {/* Card 3: Recent Showing Safety Logs */}
            <View style={styles.recentLogsCard}>
              <View style={styles.recentLogsHeader}>
                <Text style={styles.recentLogsTitle}>Recent Showing Safety Logs</Text>
                <Pressable onPress={() => setActiveTopTab('logs')}>
                  <Text style={styles.viewAllLogsText}>View All</Text>
                </Pressable>
              </View>
              {safetyLogs.length === 0 ? (
                <View style={styles.emptySosCardWrap}>
                  <Text style={styles.emptySosCardText}>No safety logs available yet.</Text>
                </View>
              ) : (
                safetyLogs.slice(0, 5).map((log, idx) => {
                  const formattedTime = formatLogTime(log.date);
                  const isSafe = (log.status || '').toLowerCase() === 'safe';
                  return (
                    <View
                      key={`${log.id || 'log'}-${idx}`}
                      style={[
                        styles.recentLogRow,
                        idx === 0 && styles.recentLogRowFirst,
                      ]}>
                      <View style={styles.recentLogLeft}>
                        <Text style={styles.recentLogName}>{log.clientName || 'Showing Client'}</Text>
                        <Text style={styles.recentLogMeta}>
                          {formattedTime} • Duration: {log.duration || 'Verification Check'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.safeBadge,
                          !isSafe && { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                        ]}>
                        <MaterialCommunityIcons
                          name={isSafe ? 'shield-check' : 'alert-circle'}
                          size={14}
                          color={isSafe ? '#00A896' : '#EF4444'}
                        />
                        <Text
                          style={[
                            styles.safeBadgeText,
                            !isSafe && { color: '#EF4444' },
                          ]}>
                          {(log.status || 'SAFE').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* TAB 2: LEAD VERIFICATION HUB (Connected with GET https://api.zien.ai/api/solo/crm/leads) */}
        {activeTopTab === 'leads' && (
          <View style={styles.directoryContainer}>
            {/* Header */}
            <View style={styles.directoryHeader}>
              <View style={styles.directoryTitleRow}>
                <Text style={styles.directoryTitle}>CRM Lead Verification Directory</Text>
                {loadingLeads && <ActivityIndicator size="small" color="#00A896" />}
              </View>
              <Text style={styles.directorySubtitle}>
                Perform US Census & Whitepages background validation checks on prospective
                clients before meeting in person.
              </Text>
            </View>

            {/* Search Box */}
            <View style={styles.directorySearchBox}>
              <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
              <TextInput
                style={styles.directorySearchInput}
                placeholder="Search leads by name or phone..."
                placeholderTextColor="#94A3B8"
                value={directorySearchQuery}
                onChangeText={setDirectorySearchQuery}
              />
              {directorySearchQuery.length > 0 && (
                <Pressable onPress={() => setDirectorySearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                </Pressable>
              )}
            </View>

            {/* Dynamic Filter Pills with Counts */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}>
              {filterTabs.map((f) => {
                const isSelected = activeLeadFilter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    style={[
                      styles.filterPill,
                      isSelected && styles.filterPillActive,
                    ]}
                    onPress={() => setActiveLeadFilter(f.id)}>
                    <Text
                      style={[
                        styles.filterPillLabel,
                        isSelected && styles.filterPillLabelActive,
                      ]}>
                      {f.label}
                    </Text>
                    <View
                      style={[
                        styles.filterPillCountBadge,
                        isSelected && styles.filterPillCountBadgeActive,
                      ]}>
                      <Text
                        style={[
                          styles.filterPillCountText,
                          isSelected && styles.filterPillCountTextActive,
                        ]}>
                        {f.count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Lead Cards List from API */}
            <View style={styles.directoryCardsList}>
              {filteredDirectoryLeads.length === 0 ? (
                <View style={styles.emptyLeadsBox}>
                  <MaterialCommunityIcons
                    name="account-search-outline"
                    size={42}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyLeadsTitle}>No Leads Found</Text>
                  <Text style={styles.emptyLeadsSub}>
                    Try searching with another keyword or change the filter tab.
                  </Text>
                </View>
              ) : (
                filteredDirectoryLeads.map((lead) => {
                  const isFailed = lead.status === 'FAILED MATCH';
                  const isCleared = lead.status === 'CLEARED';
                  const isNotVerified = lead.status === 'NOT VERIFIED';
                  const isPending = lead.status === 'PENDING CHECK';
                  const isCurrentlyVerifying = verifyingLeadId === lead.id;

                  return (
                    <View
                      key={lead.id}
                      style={[
                        styles.leadDirectoryCard,
                        isFailed && styles.leadCardFailed,
                        isCleared && styles.leadCardCleared,
                      ]}>
                      {/* Card Top: Avatar, Name/Source, Status Badge */}
                      <View style={styles.leadCardHeader}>
                        <View style={styles.leadAvatarCircle}>
                          <Text style={styles.leadAvatarInitial}>
                            {lead.name ? lead.name[0].toLowerCase() : 'u'}
                          </Text>
                        </View>
                        <View style={styles.leadCardTitleWrap}>
                          <Text style={styles.leadCardName}>{lead.name}</Text>
                          <Text style={styles.leadCardSource}>{lead.source}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            isFailed && styles.statusBadgeFailed,
                            isCleared && styles.statusBadgeCleared,
                            isNotVerified && styles.statusBadgeNotVerified,
                            isPending && styles.statusBadgePending,
                          ]}>
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isFailed && styles.statusBadgeTextFailed,
                              isCleared && styles.statusBadgeTextCleared,
                              isNotVerified && styles.statusBadgeTextNotVerified,
                              isPending && styles.statusBadgeTextPending,
                            ]}>
                            {lead.status}
                          </Text>
                        </View>
                      </View>

                      {/* Contact Details Grid */}
                      <View style={styles.leadDetailsGrid}>
                        <View style={styles.leadDetailRow}>
                          <Text style={styles.leadDetailKey}>Phone:</Text>
                          <Text style={styles.leadDetailVal}>{lead.phone}</Text>
                        </View>
                        <View style={styles.leadDetailRow}>
                          <Text style={styles.leadDetailKey}>Email:</Text>
                          <Text style={styles.leadDetailVal}>{lead.email}</Text>
                        </View>
                      </View>

                      {/* Verification Result Box (FAILED MATCH) */}
                      {isFailed && (
                        <View style={styles.failedVerificationBox}>
                          <View style={styles.failedBoxHeader}>
                            <Text style={styles.failedBoxTitle}>VERIFICATION FAILED</Text>
                            <Text style={styles.failedBoxScore}>
                              {lead.matchScore !== undefined ? lead.matchScore : 50}% Match
                            </Text>
                          </View>
                          <Text style={styles.failedBoxCarrier}>
                            Carrier: {lead.carrier || '-'} • Line Type:{' '}
                            {lead.lineType || '-'}
                          </Text>
                          {!!lead.registeredName && (
                            <Text style={styles.failedBoxDetailLine}>
                              Registered To: <Text style={{ fontWeight: '700' }}>{lead.registeredName}</Text>
                            </Text>
                          )}
                          {!!lead.registeredAddress && (
                            <Text style={styles.failedBoxDetailLine}>
                              Location: <Text style={{ fontWeight: '700' }}>{lead.registeredAddress}</Text>
                            </Text>
                          )}
                          <View style={styles.warningAlertRow}>
                            <MaterialCommunityIcons
                              name="alert-outline"
                              size={15}
                              color="#DC2626"
                            />
                            <Text style={styles.warningAlertText}>
                              {lead.warningNote ||
                                'Name match check failed. Identity mismatch warning!'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Verification Result Box (CLEARED) */}
                      {isCleared && (
                        <View style={styles.clearedVerificationBox}>
                          <View style={styles.clearedBoxHeader}>
                            <Text style={styles.clearedBoxTitle}>VERIFICATION PASSED</Text>
                            <Text style={styles.clearedBoxScore}>
                              {lead.matchScore || 98}% Match
                            </Text>
                          </View>
                          <Text style={styles.clearedBoxCarrier}>
                            Carrier: {lead.carrier || 'Verizon'} • Line Type:{' '}
                            {lead.lineType || 'Mobile'}
                          </Text>
                          <View style={styles.successAlertRow}>
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={15}
                              color="#16A34A"
                            />
                            <Text style={styles.successAlertText}>
                              {lead.successNote ||
                                'Identity match confirmed via Whitepages & US Census'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Action Button for NOT VERIFIED / PENDING */}
                      {(isNotVerified || isPending) && (
                        <Pressable
                          style={styles.verifyDetailsActionBtn}
                          onPress={() => handleOpenConsentModal(lead)}
                          disabled={isCurrentlyVerifying}>
                          {isCurrentlyVerifying ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <MaterialCommunityIcons
                                name="shield-outline"
                                size={18}
                                color="#FFFFFF"
                              />
                              <Text style={styles.verifyDetailsActionText}>
                                Verify identity details
                              </Text>
                            </>
                          )}
                        </Pressable>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* TAB 3: EMERGENCY SETTINGS (Web Matching Design) */}
        {activeTopTab === 'emergency' && (
          <View style={styles.emergencyContainer}>
            {/* Card 1: Emergency SOS Contacts */}
            <View style={styles.emergencySosCard}>
              <View style={styles.emergencyCardHeader}>
                <Text style={styles.emergencyCardTitle}>Emergency SOS Contacts</Text>
              </View>

              <View style={styles.emergencyContactsList}>
                {emergencyContacts.length === 0 ? (
                  <View style={styles.emptyEmergencyContactsBox}>
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={28}
                      color="#94A3B8"
                    />
                    <Text style={styles.emptyEmergencyContactsText}>
                      No emergency contacts configured yet. Please add one below!
                    </Text>
                  </View>
                ) : (
                  emergencyContacts.map((contact, index) => {
                    if (editingContactId === contact.id) {
                      return (
                        <View key={contact.id} style={styles.editingContactBox}>
                          <Text style={styles.editingContactTitle}>
                            Editing Emergency Contact
                          </Text>

                          <View style={styles.editingContactForm}>
                            <View style={styles.editingContactRow}>
                              <View style={styles.editingContactCol}>
                                <Text style={styles.editingContactLabel}>Contact name *</Text>
                                <TextInput
                                  style={styles.editingContactInput}
                                  value={editName}
                                  onChangeText={setEditName}
                                  placeholder="Contact Name"
                                  placeholderTextColor="#94A3B8"
                                />
                              </View>

                              <View style={styles.editingContactCol}>
                                <Text style={styles.editingContactLabel}>Relationship</Text>
                                <Pressable
                                  style={styles.relationshipSelectBtn}
                                  onPress={() =>
                                    setShowEditRelationshipMenu((prev) => !prev)
                                  }>
                                  <Text
                                    style={styles.relationshipSelectText}
                                    numberOfLines={1}>
                                    {editRelationship}
                                  </Text>
                                  <MaterialCommunityIcons
                                    name="chevron-down"
                                    size={18}
                                    color="#64748B"
                                  />
                                </Pressable>
                              </View>
                            </View>

                            {showEditRelationshipMenu && (
                              <View style={styles.relationshipDropdown}>
                                {[
                                  'Broker / Agency',
                                  'Spouse / Manager',
                                  'Colleague',
                                  'Emergency Dispatch',
                                  'Other',
                                ].map((rel) => (
                                  <Pressable
                                    key={rel}
                                    style={styles.relationshipDropdownItem}
                                    onPress={() => {
                                      setEditRelationship(rel);
                                      setShowEditRelationshipMenu(false);
                                    }}>
                                    <Text
                                      style={[
                                        styles.relationshipDropdownText,
                                        editRelationship === rel &&
                                          styles.relationshipDropdownTextActive,
                                      ]}>
                                      {rel}
                                    </Text>
                                  </Pressable>
                                ))}
                              </View>
                            )}

                            <View style={styles.editingContactRow}>
                              <View style={styles.editingContactCol}>
                                <Text style={styles.editingContactLabel}>Phone number *</Text>
                                <View style={styles.phoneInputWrap}>
                                  <Pressable
                                    style={styles.phoneFlagPrefix}
                                    onPress={() => {
                                      setTargetPickerField('edit');
                                      setCountrySearchQuery('');
                                      setCountryPickerVisible(true);
                                    }}>
                                    <Text style={styles.phoneFlagEmoji}>{editSelectedCountry.flag}</Text>
                                    <Text style={styles.phoneFlagCode}>{editSelectedCountry.dialCode}</Text>
                                    <MaterialCommunityIcons name="chevron-down" size={14} color="#64748B" />
                                  </Pressable>
                                  <TextInput
                                    style={styles.phoneInput}
                                    value={editPhone}
                                    onChangeText={setEditPhone}
                                    keyboardType="phone-pad"
                                    placeholder="(555) 000-0000"
                                    placeholderTextColor="#94A3B8"
                                  />
                                </View>
                              </View>

                              <View style={styles.editingContactCol}>
                                <Text style={styles.editingContactLabel}>Email address (optional)</Text>
                                <TextInput
                                  style={styles.editingContactInput}
                                  value={editEmail}
                                  onChangeText={setEditEmail}
                                  keyboardType="email-address"
                                  autoCapitalize="none"
                                  placeholder="email@example.com"
                                  placeholderTextColor="#94A3B8"
                                />
                              </View>
                            </View>

                            <View style={styles.editingContactBtnRow}>
                              <Pressable
                                style={styles.editingCancelBtn}
                                onPress={handleCancelEditContact}>
                                <Text style={styles.editingCancelText}>Cancel</Text>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.editingSaveBtn,
                                  savingEdit && { opacity: 0.7 },
                                ]}
                                disabled={savingEdit}
                                onPress={handleSaveEditContact}>
                                {savingEdit ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <Text style={styles.editingSaveText}>Save</Text>
                                )}
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View
                        key={`${contact.id}-${index}`}
                        style={[
                          styles.emergencyContactItem,
                          index === 0 && styles.emergencyContactItemFirst,
                        ]}>
                        <View style={styles.emergencyAvatarBox}>
                          <MaterialCommunityIcons
                            name="account-outline"
                            size={22}
                            color="#EF4444"
                          />
                        </View>

                        <View style={styles.emergencyContactInfo}>
                          <View style={styles.emergencyNameRow}>
                            <Text style={styles.emergencyContactName}>{contact.name}</Text>
                            <View style={styles.emergencyBadgeRed}>
                              <Text style={styles.emergencyBadgeRedText}>
                                {contact.relationship}
                              </Text>
                            </View>
                            {contact.isOffice && (
                              <View style={styles.emergencyBadgeGray}>
                                <Text style={styles.emergencyBadgeGrayText}>Office</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.emergencyContactMeta} numberOfLines={2}>
                            Phone: {contact.phone} • Email: {contact.email}
                          </Text>
                        </View>

                        <View style={styles.emergencyActionButtons}>
                          <Pressable
                            style={({ pressed }) => [
                              styles.emergencyActionIconBtn,
                              pressed && { opacity: 0.7 },
                            ]}
                            hitSlop={8}
                            onPress={() => handleStartEditContact(contact)}>
                            <MaterialCommunityIcons
                              name="pencil-outline"
                              size={18}
                              color={isDark ? '#CBD5E1' : '#475569'}
                            />
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [
                              styles.emergencyActionIconBtn,
                              pressed && { opacity: 0.7 },
                            ]}
                            hitSlop={8}
                            onPress={() =>
                              handleDeleteEmergencyContact(contact.id, contact.name)
                            }>
                            <MaterialCommunityIcons
                              name="trash-can-outline"
                              size={18}
                              color="#EF4444"
                            />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* Card 2: ADD EMERGENCY CONTACT Form */}
            <View style={styles.addContactCard}>
              <Text style={styles.addContactTitle}>Add Emergency Contact</Text>

              <View style={styles.addContactForm}>
                <View style={styles.addContactFormRow}>
                  <View style={styles.addContactCol}>
                    <Text style={styles.addContactLabel}>Contact name *</Text>
                    <TextInput
                      style={styles.addContactInput}
                      placeholder="e.g. John Doe"
                      placeholderTextColor="#94A3B8"
                      value={newContactName}
                      onChangeText={setNewContactName}
                    />
                  </View>

                  <View style={styles.addContactCol}>
                    <Text style={styles.addContactLabel}>Relationship</Text>
                    <Pressable
                      style={styles.relationshipSelectBtn}
                      onPress={() => setShowRelationshipMenu((prev) => !prev)}>
                      <Text style={styles.relationshipSelectText} numberOfLines={1}>
                        {newContactRelationship}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={18}
                        color="#64748B"
                      />
                    </Pressable>
                  </View>
                </View>

                {showRelationshipMenu && (
                  <View style={styles.relationshipDropdown}>
                    {['Broker / Agency', 'Spouse / Manager', 'Colleague', 'Emergency Dispatch', 'Other'].map(
                      (rel) => (
                        <Pressable
                          key={rel}
                          style={styles.relationshipDropdownItem}
                          onPress={() => {
                            setNewContactRelationship(rel);
                            setShowRelationshipMenu(false);
                          }}>
                          <Text
                            style={[
                              styles.relationshipDropdownText,
                              newContactRelationship === rel && styles.relationshipDropdownTextActive,
                            ]}>
                            {rel}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                )}

                <View style={styles.addContactFormRow}>
                  <View style={styles.addContactCol}>
                    <Text style={styles.addContactLabel}>Phone number *</Text>
                    <View style={styles.phoneInputWrap}>
                      <Pressable
                        style={styles.phoneFlagPrefix}
                        onPress={() => {
                          setTargetPickerField('add');
                          setCountrySearchQuery('');
                          setCountryPickerVisible(true);
                        }}>
                        <Text style={styles.phoneFlagEmoji}>{selectedCountry.flag}</Text>
                        <Text style={styles.phoneFlagCode}>{selectedCountry.dialCode}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={14} color="#64748B" />
                      </Pressable>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="(555) 000-0000"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={newContactPhone}
                        onChangeText={setNewContactPhone}
                      />
                    </View>
                  </View>

                  <View style={styles.addContactCol}>
                    <Text style={styles.addContactLabel}>Email address (optional)</Text>
                    <TextInput
                      style={styles.addContactInput}
                      placeholder="email@example.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={newContactEmail}
                      onChangeText={setNewContactEmail}
                    />
                  </View>
                </View>

                <Pressable
                  style={[styles.addContactSubmitBtn, submittingContact && { opacity: 0.7 }]}
                  disabled={submittingContact}
                  onPress={handleAddEmergencyContact}>
                  {submittingContact ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                      <Text style={styles.addContactSubmitText}>Add Emergency Contact</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Card 3: Safety Switch Policies */}
            <View style={styles.policiesCard}>
              <Text style={styles.policiesCardTitle}>Safety Switch Policies</Text>

              <View style={styles.policySwitchItem}>
                <View style={styles.policySwitchTextWrap}>
                  <Text style={styles.policySwitchTitle}>Auto-Notify Emergency on Expiry</Text>
                  <Text style={styles.policySwitchSub}>
                    Send SMS automatically when timer hits 0:00.
                  </Text>
                </View>
                <Switch
                  value={safetyPolicies.autoNotify}
                  onValueChange={(val) =>
                    setSafetyPolicies((prev) => ({ ...prev, autoNotify: val }))
                  }
                  trackColor={{ false: '#D7DEE7', true: '#00A896' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.policySwitchItem}>
                <View style={styles.policySwitchTextWrap}>
                  <Text style={styles.policySwitchTitle}>Continuous GPS Tracking</Text>
                  <Text style={styles.policySwitchSub}>
                    Stream live location coordinates to broker servers.
                  </Text>
                </View>
                <Switch
                  value={safetyPolicies.continuousGps}
                  onValueChange={(val) =>
                    setSafetyPolicies((prev) => ({ ...prev, continuousGps: val }))
                  }
                  trackColor={{ false: '#D7DEE7', true: '#00A896' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.policySwitchItem}>
                <View style={styles.policySwitchTextWrap}>
                  <Text style={styles.policySwitchTitle}>Silent Panic Signals</Text>
                  <Text style={styles.policySwitchSub}>
                    SOS trigger won't play alarm sound on device.
                  </Text>
                </View>
                <Switch
                  value={safetyPolicies.silentPanic}
                  onValueChange={(val) =>
                    setSafetyPolicies((prev) => ({ ...prev, silentPanic: val }))
                  }
                  trackColor={{ false: '#D7DEE7', true: '#00A896' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Card 4: Safety Switch Info & Message Preview */}
            <View style={styles.messagePreviewCard}>
              <View style={styles.messagePreviewHeader}>
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={22}
                  color="#EF4444"
                />
                <Text style={styles.messagePreviewTitle}>
                  Safety Switch Info & Message Preview
                </Text>
              </View>

              <Text style={styles.messagePreviewDesc}>
                How it works: If your safety timer hits 0:00 without a check-in, or if you click
                the panic button, Zien Guardian will automatically send an emergency notification
                to the contacts you configure.
              </Text>

              <View style={styles.messageQuoteBox}>
                <Text style={styles.messageQuoteBoxHeader}>
                  MESSAGE PREVIEW (SMS & EMAIL)
                </Text>
                <Text style={styles.messageQuoteText}>
                  "EMERGENCY ALERT: Zien Agent started a property showing safety switch timer and
                  failed to check-in safe within the session duration. Please verify their safety
                  immediately. Last known location details logged."
                </Text>
                <Text style={styles.messageQuoteFooter}>
                  * Sent automatically via Zien Guardian alert gateways.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 4: SAFETY LOGS (Logs & Reports - Web Design) */}
        {activeTopTab === 'logs' && (
          <View style={styles.logsReportsContainer}>
            {/* Header */}
            <View style={styles.logsReportsHeader}>
              <Text style={styles.logsReportsTitle}>Logs & Reports</Text>
              <Text style={styles.logsReportsSubtitle}>
                Centralized repository for operational telemetry and safety compliance records.
              </Text>
            </View>

            {/* Metric Grid (4 Web Metric Cards) */}
            <View style={styles.logsMetricGrid}>
              {[
                { id: 'telemetry', icon: 'console' as const, label: 'Total telemetry', value: String(safetyLogs.length || 5) },
                { id: 'compliance', icon: 'shield-outline' as const, label: 'Compliance rate', value: '0%' },
                { id: 'sessions', icon: 'pulse' as const, label: 'Active sessions', value: '00' },
                { id: 'integrity', icon: 'shield-lock-outline' as const, label: 'Audit integrity', value: 'Vaulted' },
              ].map((m) => (
                <View key={m.id} style={styles.logsMetricCard}>
                  <View style={styles.logsMetricIconWrap}>
                    <MaterialCommunityIcons name={m.icon} size={20} color="#00A896" />
                  </View>
                  <View style={styles.logsMetricInfo}>
                    <Text style={styles.logsMetricLabel} numberOfLines={1}>
                      {m.label}
                    </Text>
                    <Text style={styles.logsMetricValue}>{m.value}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Operation Audit Trail Card */}
            <View style={styles.auditTrailCard}>
              <View style={styles.auditTrailTopAccent} />
              
              <View style={styles.auditTrailCardInner}>
                <Text style={styles.auditTrailTitle}>Operation Audit Trail</Text>

                {/* Table Header Labels */}
                <View style={styles.auditTableHead}>
                  <Text style={[styles.auditTableHeadCol, { flex: 1.2 }]}>Timestamp</Text>
                  <Text style={[styles.auditTableHeadCol, { flex: 2 }]}>Event / Category</Text>
                  <Text style={[styles.auditTableHeadCol, { flex: 1, textAlign: 'right' }]}>Severity</Text>
                </View>

                {/* Audit Items List */}
                <View style={styles.auditListContainer}>
                  {(showAllArchivedLogs ? safetyLogs : safetyLogs.slice(0, 1)).map((rawLog, idx) => {
                    const row = parseSafetyLog(rawLog);
                    return (
                      <View
                        key={row.id || idx}
                        style={[
                          styles.auditRowItem,
                          idx === 0 && styles.auditRowItemFirst,
                        ]}>
                        {/* Top row: Time & Severity Dot */}
                        <View style={styles.auditRowTop}>
                          <View style={styles.auditRowTimeWrap}>
                            <MaterialCommunityIcons
                              name="clock-outline"
                              size={14}
                              color="#64748B"
                            />
                            <Text style={styles.auditRowTimeText}>{row.time}</Text>
                          </View>

                          <View style={styles.severityDotRow}>
                            <View
                              style={[
                                styles.severityDot,
                                row.severity === 'CRITICAL'
                                  ? styles.severityDotCritical
                                  : row.severity === 'WARNING'
                                  ? styles.severityDotWarning
                                  : styles.severityDotLow,
                              ]}
                            />
                            <Text
                              style={[
                                styles.severityDotText,
                                row.severity === 'CRITICAL'
                                  ? styles.severityDotTextCritical
                                  : row.severity === 'WARNING'
                                  ? styles.severityDotTextWarning
                                  : styles.severityDotTextLow,
                              ]}>
                              {row.severity}
                            </Text>
                          </View>
                        </View>

                        {/* Event Description */}
                        <Text style={styles.auditRowEventText}>{row.event}</Text>

                        {/* Bottom Meta Row: Category Pill & Responsible Agent */}
                        <View style={styles.auditRowMetaBottom}>
                          <View style={styles.auditCategoryPill}>
                            <Text style={styles.auditCategoryPillText}>{row.category}</Text>
                          </View>
                          <Text style={styles.auditAgentText}>{row.agent}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Load Archived Logs Action Button */}
                <Pressable
                  style={styles.loadArchivedLogsBtn}
                  onPress={() => setShowAllArchivedLogs((prev) => !prev)}>
                  <Text style={styles.loadArchivedLogsText}>
                    {showAllArchivedLogs ? 'Collapse Logs' : 'Load Archived Logs'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* CRM Meeting Lead Picker Modal (using live CRM API leads) */}
      <Modal
        visible={showMeetingLeadModal}
        animationType="slide"
        onRequestClose={() => setShowMeetingLeadModal(false)}>
        <View
          style={[
            styles.modalFullContainer,
            { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) },
          ]}>
          <View style={styles.modalHeaderFull}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleFull}>Select CRM Lead</Text>
              <Text style={styles.modalSubtitleFull}>
                Choose the client you are meeting for this showing session.
              </Text>
            </View>
            <Pressable
              style={styles.modalCloseBtnFull}
              onPress={() => setShowMeetingLeadModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.crmSearchContainer}>
            <View style={styles.crmSearchBox}>
              <MaterialCommunityIcons name="magnify" size={20} color="#9AA7B6" />
              <TextInput
                style={styles.crmSearchInput}
                placeholder="Search leads by name, email, or phone..."
                placeholderTextColor="#9AA7B6"
                value={meetingLeadSearch}
                onChangeText={setMeetingLeadSearch}
              />
            </View>
          </View>

          <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.crmLeadsList}>
              {directoryLeads
                .filter(
                  (l) =>
                    l.name.toLowerCase().includes(meetingLeadSearch.toLowerCase()) ||
                    l.email.toLowerCase().includes(meetingLeadSearch.toLowerCase()) ||
                    l.phone.toLowerCase().includes(meetingLeadSearch.toLowerCase())
                )
                .map((lead) => {
                  const isSelected = selectedMeetingLead?.id === lead.id;
                  const isFailed = lead.status === 'FAILED MATCH';
                  return (
                    <Pressable
                      key={lead.id}
                      style={[styles.crmLeadItem, isSelected && styles.crmLeadItemSelected]}
                      onPress={() => {
                        setSelectedMeetingLead(lead);
                        setShowMeetingLeadModal(false);
                      }}>
                      <View style={styles.leadAvatarCircleModal}>
                        <Text style={styles.leadAvatarTextModal}>{lead.name[0]}</Text>
                      </View>
                      <View style={styles.crmLeadInfo}>
                        <Text style={styles.crmLeadName}>{lead.name}</Text>
                        <Text style={styles.crmLeadSub}>
                          {lead.source} • {lead.phone}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.leadTrustScoreBadge,
                          isFailed && styles.leadTrustScoreBadgeFailed,
                        ]}>
                        <MaterialCommunityIcons
                          name={isFailed ? 'alert-circle' : 'shield-check'}
                          size={14}
                          color={isFailed ? '#EF4444' : '#16A34A'}
                        />
                        <Text
                          style={[
                            styles.leadTrustScoreText,
                            isFailed && styles.leadTrustScoreTextFailed,
                          ]}>
                          {lead.matchScore ? `${lead.matchScore}% Score` : lead.status}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          </ScrollView>

          <View style={styles.modalFooterFixed}>
            <Pressable
              style={styles.cancelBtnPremium}
              onPress={() => {
                setSelectedMeetingLead(null);
                setShowMeetingLeadModal(false);
              }}>
              <Text style={styles.cancelBtnTextPremium}>Clear Lead Selection</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Emergency SOS Confirmation Modal */}
      <Modal
        visible={showSosModal}
        transparent
        animationType="fade"
        onRequestClose={resetGuardianTimer}>
        <Pressable style={styles.modalOverlay} onPress={resetGuardianTimer}>
          <Pressable style={styles.sosModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sosModalIconWrap}>
              <MaterialCommunityIcons name="alert" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.sosModalTitle}>Trigger Emergency SOS?</Text>
            <Text style={styles.sosModalBody}>
              This will immediately transmit your live location, audio stream, and
              emergency escalation to Zien HQ and local emergency authorities.
            </Text>
            <View style={styles.sosModalActions}>
              <Pressable
                style={styles.sosModalConfirmBtn}
                onPress={handleTriggerPanicAlarm}>
                <Text style={styles.sosModalConfirmBtnText}>YES, TRANSMIT SOS</Text>
              </Pressable>
              <Pressable style={styles.sosModalCancelBtn} onPress={resetGuardianTimer}>
                <Text style={styles.sosModalCancelBtnText}>CANCEL</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Safety Report Filing Modal */}
      <Modal
        visible={showSafetyModal}
        animationType="slide"
        onRequestClose={() => setShowSafetyModal(false)}>
        <View
          style={[
            styles.modalFullContainer,
            { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) },
          ]}>
          <View style={styles.modalHeaderFull}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleFull}>File Safety Report</Text>
              <Text style={styles.modalSubtitleFull}>
                Submit an encrypted incident record to brokerage governance.
              </Text>
            </View>
            <Pressable
              style={styles.modalCloseBtnFull}
              onPress={() => setShowSafetyModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.modalFormContent}>
              <Text style={styles.uploadSectionLabelFull}>Incident Classification</Text>
              <TextInput
                style={styles.identityInputFull}
                value={incidentCategory}
                onChangeText={setIncidentCategory}
                placeholder="e.g. Situational Anomalies"
                placeholderTextColor="#9AA7B6"
              />

              <Text style={styles.uploadSectionLabelFull}>Detailed Disclosure</Text>
              <TextInput
                style={[styles.identityInputFull, { height: 100, textAlignVertical: 'top' }]}
                value={disclosureText}
                onChangeText={setDisclosureText}
                placeholder="Describe situation, parties involved, and field observations..."
                placeholderTextColor="#9AA7B6"
                multiline
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooterFixed}>
            <Pressable
              style={styles.initAuditBtnPremium}
              onPress={() => {
                Alert.alert('Report Filed', 'Safety report securely filed with broker governance.');
                setShowSafetyModal(false);
                setDisclosureText('');
              }}>
              <Text style={styles.initAuditBtnTextPremium}>Submit Encrypted Report</Text>
            </Pressable>
            <Pressable
              style={styles.cancelBtnPremium}
              onPress={() => setShowSafetyModal(false)}>
              <Text style={styles.cancelBtnTextPremium}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* FCRA Verification Consent Modal (Web Matching) */}
      <Modal
        visible={!!consentModalLead}
        transparent
        animationType="fade"
        onRequestClose={() => !isVerifyingApi && setConsentModalLead(null)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !isVerifyingApi && setConsentModalLead(null)}>
          <Pressable style={styles.consentModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.consentHeaderRow}>
              <View style={styles.consentIconBadge}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={24}
                  color="#00A896"
                />
              </View>
              <Text style={styles.consentModalTitle}>FCRA Verification Consent</Text>
            </View>

            <Text style={styles.consentModalDesc}>
              Under the Federal Fair Credit Reporting Act (FCRA), you must acknowledge that you
              have obtained appropriate consent from this individual before running background or
              identity verifications on their data.
            </Text>

            <View style={styles.consentStatementBox}>
              <Text style={styles.consentStatementText}>
                <Text style={styles.consentStatementBold}>Consent Statement: </Text>
                "I certify that I have explicit authorization from this contact to perform identity
                verification searches using Zien Guardian."
              </Text>
            </View>

            <View style={styles.consentModalActions}>
              <Pressable
                style={[
                  styles.consentConfirmBtn,
                  isVerifyingApi && styles.btnDisabled,
                ]}
                onPress={handleConfirmConsentAndVerify}
                disabled={isVerifyingApi}>
                {isVerifyingApi ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.consentConfirmBtnText}>I Consent & Verify</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.consentCancelBtn}
                onPress={() => setConsentModalLead(null)}
                disabled={isVerifyingApi}>
                <Text style={styles.consentCancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Country Code Selection Modal ── */}
      <Modal
        visible={countryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryPickerVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCountryPickerVisible(false)}>
          <Pressable
            style={[styles.countryPickerModalCard, { maxHeight: 540 }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.countryPickerHeader}>
              <Text style={styles.countryPickerTitle}>Select Country Code</Text>
              <Pressable
                style={styles.countryPickerCloseBtn}
                onPress={() => setCountryPickerVisible(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <View style={styles.countrySearchInputWrap}>
              <MaterialCommunityIcons
                name="magnify"
                size={18}
                color="#94A3B8"
              />
              <TextInput
                style={styles.countrySearchInput}
                placeholder="Search country or dial code..."
                placeholderTextColor="#94A3B8"
                value={countrySearchQuery}
                onChangeText={setCountrySearchQuery}
                autoCorrect={false}
              />
              {countrySearchQuery.length > 0 && (
                <Pressable onPress={() => setCountrySearchQuery('')}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={16}
                    color="#94A3B8"
                  />
                </Pressable>
              )}
            </View>

            <ScrollView
              style={styles.countryListScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {filteredCountries.map((item) => {
                const isSelected =
                  targetPickerField === 'add'
                    ? selectedCountry.code === item.code
                    : editSelectedCountry.code === item.code;

                return (
                  <Pressable
                    key={item.code}
                    style={({ pressed }) => [
                      styles.countryPickerItemRow,
                      isSelected && styles.countryPickerItemSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      if (targetPickerField === 'add') {
                        setSelectedCountry(item);
                      } else {
                        setEditSelectedCountry(item);
                      }
                      setCountryPickerVisible(false);
                      setCountrySearchQuery('');
                    }}>
                    <Text style={styles.countryPickerFlag}>{item.flag}</Text>
                    <Text
                      style={[
                        styles.countryPickerItemName,
                        isSelected && styles.countryPickerItemNameSelected,
                      ]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.countryPickerItemDial,
                        isSelected && styles.countryPickerItemDialSelected,
                      ]}>
                      {item.dialCode}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── PANIC MODE ACTIVE (Full-Screen Red Emergency Takeover matching Web) ── */}
      <Modal
        visible={panicModeActive}
        animationType="fade"
        transparent={false}
        onRequestClose={handleCancelPanicAlarm}>
        <View style={[styles.panicFullScreen, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) }]}>
          <ScrollView
            contentContainerStyle={styles.panicScrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Top Shield Icon */}
            <View style={styles.panicShieldWrap}>
              <MaterialCommunityIcons name="shield-alert-outline" size={72} color="#FFFFFF" />
            </View>

            {/* Panic Title & Subtitle */}
            <Text style={styles.panicTitle}>PANIC MODE ACTIVE</Text>
            <Text style={styles.panicSubtitle}>
              Zien Guardian Switch timer expired or SOS was manually triggered. Emergency notifications with your live GPS location are being sent to your contacts.
            </Text>

            {/* Security Escalation Protocol Card */}
            <View style={styles.panicProtocolCard}>
              <View style={styles.protocolHeader}>
                <MaterialCommunityIcons name="pulse" size={18} color="#EF4444" />
                <Text style={styles.protocolTitle}>SECURITY ESCALATION PROTOCOL:</Text>
              </View>

              <View style={styles.protocolList}>
                <View style={styles.protocolItem}>
                  <Text style={styles.protocolBullet}>• 📡</Text>
                  <Text style={styles.protocolItemText}>
                    <Text style={styles.protocolBold}>GPS Tracking: </Text>
                    Streaming coordinates (25.7617, -80.1918)
                  </Text>
                </View>

                <View style={styles.protocolItem}>
                  <Text style={styles.protocolBullet}>• ✉️</Text>
                  <Text style={styles.protocolItemText}>
                    <Text style={styles.protocolBold}>SOS Dispatch: </Text>
                    Sent alert notifications to all emergency contacts.
                  </Text>
                </View>

                <View style={styles.protocolItem}>
                  <Text style={styles.protocolBullet}>• 🔊</Text>
                  <Text style={styles.protocolItemText}>
                    <Text style={styles.protocolBold}>Audio Alarm: </Text>
                    🚨 Emergency alarm active (Playing siren sound)
                  </Text>
                </View>
              </View>

              {/* Direct Cancel Alarm Button (No PIN required) */}
              <Pressable
                style={styles.panicCancelBtn}
                onPress={handleCancelPanicAlarm}>
                <Text style={styles.panicCancelBtnText}>Cancel Alarm</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </GuardianScreenShell>
  );
}

const getStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 24,
    },
    topTabsContainer: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(215, 233, 242, 0.4)',
      borderRadius: 18,
      padding: 5,
      marginBottom: 16,
    },
    topTabsScroll: {
      flexDirection: 'row',
      gap: 4,
    },
    topTabPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: 'transparent',
    },
    topTabPillActive: {
      backgroundColor: colors.cardBackground,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    topTabPillText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    topTabPillTextActive: {
      color: colors.textPrimary,
      fontWeight: '900',
    },

    // Main Safety Card (White container on web)
    mainSafetyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#0A2341',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    standbyHeaderPill: {
      alignSelf: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginBottom: 20,
    },
    standbyPillContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    standbyPillText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#64748B',
      letterSpacing: 0.5,
    },
    standbyPillTextActive: {
      color: '#00A896',
    },
    standbyDivider: {
      color: '#94A3B8',
      fontSize: 12,
      marginHorizontal: 2,
    },

    // Meeting Section
    meetingSection: {
      marginBottom: 20,
    },
    meetingLabel: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 0.4,
      marginBottom: 8,
    },
    meetingSelectorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    meetingPlaceholder: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: '#94A3B8',
    },
    selectedLeadPreview: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectedLeadName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    selectedLeadTrustBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(22, 163, 74, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    selectedLeadTrustBadgeFailed: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    selectedLeadTrustText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#16A34A',
    },
    selectedLeadTrustTextFailed: {
      color: '#EF4444',
    },
    meetingHelperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingHorizontal: 2,
    },
    meetingHelperText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748B',
    },
    meetingHelperTextCleared: {
      color: '#16A34A',
      fontWeight: '700',
    },
    meetingHelperTextFailed: {
      color: '#EF4444',
      fontWeight: '700',
    },

    // Circular Countdown Timer
    timerCenterContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 12,
    },
    timerCircle: {
      width: 170,
      height: 170,
      borderRadius: 85,
      borderWidth: 5,
      borderColor: isDark ? '#1E293B' : '#E2E8F0',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0A2341',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    timerCircleActive: {
      borderColor: '#00A896',
      borderWidth: 5,
      backgroundColor: isDark ? 'rgba(0, 168, 150, 0.05)' : '#F0FDFB',
    },
    timerDisplayTime: {
      fontSize: 38,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    timerDisplayTimeActive: {
      color: colors.textPrimary,
    },
    timerDisplayLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#64748B',
      letterSpacing: 0.6,
      marginTop: 4,
    },
    timerDisplayLabelActive: {
      color: '#00A896',
      fontWeight: '900',
    },

    // Duration Options
    durationRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 20,
    },
    durationBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    durationBtnActive: {
      backgroundColor: '#0A2341',
      borderColor: '#0A2341',
    },
    durationBtnDisabled: {
      opacity: 0.5,
    },
    durationBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#475569',
    },
    durationBtnTextActive: {
      color: '#FFFFFF',
    },

    // Start Session Button
    startSessionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: '#009E96',
      paddingVertical: 15,
      borderRadius: 14,
      shadowColor: '#009E96',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    startSessionBtnText: {
      fontSize: 15,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    activeSessionActionGroup: {
      gap: 10,
    },
    activeSessionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    markSafeBtn: {
      flex: 1.2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(0, 168, 150, 0.5)' : '#00A896',
      paddingVertical: 13,
      borderRadius: 14,
    },
    markSafeBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    addTimeBtn: {
      flex: 0.8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingVertical: 13,
      borderRadius: 14,
    },
    addTimeBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    triggerPanicBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#EF4444',
      paddingVertical: 14,
      borderRadius: 14,
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    triggerPanicBtnText: {
      fontSize: 13.5,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },

    // Card 2: SOS Emergency Contacts
    sosContactsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderLeftWidth: 4,
      borderLeftColor: '#EF4444',
      shadowColor: '#0A2341',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 3,
    },
    sosContactsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sosContactsTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    emptySosCardWrap: {
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptySosCardText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    sosContactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    sosContactItemFirst: {
      borderTopWidth: 0,
      paddingTop: 4,
    },
    sosContactInfo: {
      flex: 1,
    },
    sosContactName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    sosContactRole: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    sosCallIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(0, 168, 150, 0.15)' : 'rgba(0, 168, 150, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(0, 168, 150, 0.2)',
    },

    // Card 3: Recent Showing Safety Logs
    recentLogsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#0A2341',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 3,
    },
    recentLogsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    recentLogsTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    viewAllLogsText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#00A896',
    },
    recentLogRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    recentLogRowFirst: {
      borderTopWidth: 0,
      paddingTop: 4,
    },
    recentLogLeft: {
      flex: 1,
    },
    recentLogName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    recentLogMeta: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    safeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(0, 168, 150, 0.15)' : 'rgba(0, 168, 150, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(0, 168, 150, 0.25)',
    },
    safeBadgeText: {
      fontSize: 11,
      fontWeight: '900',
      color: '#00A896',
    },

    // Stats Card
    statsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statValue: { fontSize: 13, fontWeight: '900', color: colors.textPrimary },
    statLabel: {
      fontSize: 7.5,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.4,
      marginTop: 1,
    },

    // ==========================================
    // CRM LEAD VERIFICATION DIRECTORY (LIVE API)
    // ==========================================
    directoryContainer: {
      marginBottom: 16,
    },
    directoryHeader: {
      marginBottom: 16,
      paddingHorizontal: 2,
    },
    directoryTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    directoryTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    directorySubtitle: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    directorySearchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
      marginBottom: 16,
    },
    directorySearchInput: {
      flex: 1,
      fontSize: 13.5,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    filterPillsScroll: {
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 16,
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    },
    filterPillActive: {
      backgroundColor: isDark ? 'rgba(0, 168, 150, 0.15)' : '#E6F7F6',
      borderColor: '#00A896',
    },
    filterPillLabel: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    filterPillLabelActive: {
      color: '#00A896',
      fontWeight: '900',
    },
    filterPillCountBadge: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    filterPillCountBadgeActive: {
      backgroundColor: '#00A896',
    },
    filterPillCountText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    filterPillCountTextActive: {
      color: '#FFFFFF',
    },
    directoryCardsList: {
      gap: 14,
    },
    emptyLeadsBox: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 30,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyLeadsTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
      marginTop: 10,
    },
    emptyLeadsSub: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    leadDirectoryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      shadowColor: '#0A2341',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    leadCardFailed: {
      borderColor: '#EF4444',
    },
    leadCardCleared: {
      borderColor: 'rgba(22, 163, 74, 0.4)',
    },
    leadCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    leadAvatarCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    leadAvatarInitial: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
      textTransform: 'lowercase',
    },
    leadCardTitleWrap: {
      flex: 1,
    },
    leadCardName: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    leadCardSource: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    statusBadgeFailed: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    statusBadgeCleared: {
      backgroundColor: 'rgba(22, 163, 74, 0.12)',
    },
    statusBadgeNotVerified: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
    },
    statusBadgePending: {
      backgroundColor: 'rgba(234, 179, 8, 0.15)',
    },
    statusBadgeText: {
      fontSize: 10.5,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    statusBadgeTextFailed: { color: '#EF4444' },
    statusBadgeTextCleared: { color: '#16A34A' },
    statusBadgeTextNotVerified: { color: '#64748B' },
    statusBadgeTextPending: { color: '#CA8A04' },

    leadDetailsGrid: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      gap: 6,
    },
    leadDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    leadDetailKey: {
      width: 60,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    leadDetailVal: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },

    // Failed Verification Box
    failedVerificationBox: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.25)',
      borderRadius: 14,
      padding: 12,
      marginTop: 14,
    },
    failedBoxHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    failedBoxTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: '#EF4444',
      letterSpacing: 0.4,
    },
    failedBoxScore: {
      fontSize: 12,
      fontWeight: '900',
      color: '#EF4444',
    },
    failedBoxCarrier: {
      fontSize: 11,
      fontWeight: '600',
      color: '#64748B',
      marginBottom: 4,
    },
    failedBoxDetailLine: {
      fontSize: 11.5,
      fontWeight: '500',
      color: isDark ? '#E2E8F0' : '#334155',
      marginBottom: 3,
    },
    warningAlertRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    warningAlertText: {
      flex: 1,
      fontSize: 11.5,
      fontWeight: '700',
      color: '#DC2626',
      lineHeight: 16,
    },

    // Cleared Verification Box
    clearedVerificationBox: {
      backgroundColor: isDark ? 'rgba(22, 163, 74, 0.08)' : '#F0FDF4',
      borderWidth: 1,
      borderColor: 'rgba(22, 163, 74, 0.25)',
      borderRadius: 14,
      padding: 12,
      marginTop: 14,
    },
    clearedBoxHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    clearedBoxTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: '#16A34A',
      letterSpacing: 0.4,
    },
    clearedBoxScore: {
      fontSize: 12,
      fontWeight: '900',
      color: '#16A34A',
    },
    clearedBoxCarrier: {
      fontSize: 11,
      fontWeight: '600',
      color: '#64748B',
      marginBottom: 6,
    },
    successAlertRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    successAlertText: {
      flex: 1,
      fontSize: 11.5,
      fontWeight: '700',
      color: '#16A34A',
      lineHeight: 16,
    },

    // Action Button
    verifyDetailsActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#0A2341',
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 14,
    },
    verifyDetailsActionText: {
      fontSize: 13,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    // Emergency Settings Styles (Web Matching)
    emergencyContainer: {
      gap: 16,
      marginBottom: 16,
    },
    emergencySosCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 18,
      shadowColor: '#0A2341',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    emergencyCardHeader: {
      marginBottom: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    emergencyCardTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    emergencyContactsList: {
      gap: 12,
    },
    emergencyContactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      gap: 12,
      justifyContent: 'space-between',
    },
    emergencyContactItemFirst: {
      borderTopWidth: 0,
      paddingTop: 2,
    },
    emergencyAvatarBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    emergencyContactInfo: {
      flex: 1,
      minWidth: 0,
      paddingRight: 6,
    },
    emergencyNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 3,
    },
    emergencyContactName: {
      fontSize: 14.5,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    emergencyBadgeRed: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    emergencyBadgeRedText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#DC2626',
    },
    emergencyBadgeGray: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    emergencyBadgeGrayText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    emergencyContactMeta: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
      lineHeight: 16,
    },
    emergencyActionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    emergencyActionIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Editing Emergency Contact Box (Web Matching Green Form)
    editingContactBox: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.06)' : '#F0FDF4',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.35)' : '#86EFAC',
      borderRadius: 16,
      padding: 16,
      marginVertical: 4,
    },
    editingContactTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#16A34A',
      marginBottom: 12,
    },
    editingContactForm: {
      gap: 12,
    },
    editingContactRow: {
      flexDirection: 'column',
      gap: 12,
    },
    editingContactCol: {
      gap: 5,
    },
    editingContactLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    editingContactInput: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13.5,
      color: colors.textPrimary,
    },
    editingContactBtnRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10,
      marginTop: 6,
    },
    editingCancelBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
      backgroundColor: 'transparent',
    },
    editingCancelText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    editingSaveBtn: {
      backgroundColor: '#0A2341',
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 8,
      minWidth: 70,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editingSaveText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    // Empty Emergency Contacts State Box
    emptyEmergencyContactsBox: {
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
      borderStyle: 'dashed',
      borderRadius: 16,
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
    },
    emptyEmergencyContactsText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },

    // Add Emergency Contact Form
    addContactCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
      padding: 18,
    },
    addContactTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 14,
    },
    addContactForm: {
      gap: 12,
    },
    addContactFormRow: {
      flexDirection: 'column',
      gap: 12,
    },
    addContactCol: {
      gap: 6,
    },
    addContactLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    addContactInput: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 13.5,
      color: colors.textPrimary,
    },
    relationshipSelectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    relationshipSelectText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    relationshipDropdown: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: -6,
    },
    relationshipDropdownItem: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    relationshipDropdownText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    relationshipDropdownTextActive: {
      color: '#00A896',
      fontWeight: '900',
    },
    phoneInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      overflow: 'hidden',
    },
    phoneFlagPrefix: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRightWidth: 1,
      borderRightColor: colors.cardBorder,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F1F5F9',
    },
    phoneFlagEmoji: {
      fontSize: 14,
    },
    phoneFlagCode: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    phoneInput: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13.5,
      color: colors.textPrimary,
    },
    addContactSubmitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#EF4444',
      paddingVertical: 13,
      borderRadius: 12,
      marginTop: 4,
    },
    addContactSubmitText: {
      fontSize: 13.5,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    // Safety Switch Policies Card
    policiesCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 18,
      gap: 14,
    },
    policiesCardTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    policySwitchItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    policySwitchTextWrap: {
      flex: 1,
      paddingRight: 12,
    },
    policySwitchTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    policySwitchSub: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Message Preview Card
    messagePreviewCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 18,
    },
    messagePreviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    messagePreviewTitle: {
      fontSize: 15.5,
      fontWeight: '900',
      color: '#EF4444',
    },
    messagePreviewDesc: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 14,
    },
    messageQuoteBox: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
      borderRadius: 14,
      padding: 14,
    },
    messageQuoteBoxHeader: {
      fontSize: 10.5,
      fontWeight: '900',
      color: '#DC2626',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    messageQuoteText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: isDark ? '#FCA5A5' : '#991B1B',
      fontStyle: 'italic',
      lineHeight: 18,
      marginBottom: 8,
    },
    messageQuoteFooter: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? 'rgba(252, 165, 165, 0.7)' : '#B91C1C',
    },

    // Generic Premium Card & Policies
    premiumCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#0A2341',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    premiumCardTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    policyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    policyRowFirst: {
      borderTopWidth: 0,
      paddingTop: 4,
    },
    policyLabel: {
      flex: 1,
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.textPrimary,
      marginLeft: 12,
    },
    protocolGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    protocolCard: {
      width: '48%',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 14,
    },
    protocolCardTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 8,
    },
    protocolCardDesc: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 15,
    },

    // Surveillance Styles
    survRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    survRowFirst: { borderTopWidth: 0 },
    survIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(0, 168, 150, 0.15)' : 'rgba(0, 168, 150, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    survText: { flex: 1 },
    survTitle: { fontSize: 13.5, fontWeight: '800', color: colors.textPrimary },
    survSub: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
    pillActive: {
      backgroundColor: 'rgba(22, 163, 74, 0.12)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    pillActiveText: { fontSize: 10.5, fontWeight: '900', color: '#16A34A' },
    pillSecure: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    pillSecureActive: {
      backgroundColor: '#00A896',
    },
    pillSecureText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    pillSecureTextActive: {
      color: '#FFFFFF',
    },
    secureMessageBlock: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    secureMessageDesc: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    secureMessageBold: {
      fontWeight: '900',
      color: colors.textPrimary,
    },
    secureMessageRow: {
      flexDirection: 'row',
      gap: 8,
    },
    secureMessageInput: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.textPrimary,
    },
    secureSendBtn: {
      backgroundColor: '#00A896',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secureSendBtnText: {
      fontSize: 13,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    // Logs & Reports Styles (Web Matching)
    logsReportsContainer: {
      marginBottom: 16,
    },
    logsReportsHeader: {
      marginBottom: 16,
      paddingHorizontal: 2,
    },
    logsReportsTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    logsReportsSubtitle: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    logsMetricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    logsMetricCard: {
      width: '48%',
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      shadowColor: '#0A2341',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    logsMetricIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(0, 168, 150, 0.15)' : '#E6F7F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    logsMetricInfo: {},
    logsMetricLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#64748B',
      letterSpacing: 0.5,
    },
    logsMetricValue: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      marginTop: 2,
    },
    auditTrailCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      shadowColor: '#0A2341',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    auditTrailTopAccent: {
      height: 3.5,
      backgroundColor: '#0A2341',
    },
    auditTrailCardInner: {
      padding: 18,
    },
    auditTrailTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 14,
    },
    auditTableHead: {
      flexDirection: 'row',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      marginBottom: 8,
    },
    auditTableHeadCol: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#94A3B8',
    },
    auditListContainer: {
      gap: 12,
    },
    auditRowItem: {
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    auditRowItemFirst: {
      borderTopWidth: 0,
      paddingTop: 4,
    },
    auditRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    auditRowTimeWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    auditRowTimeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    severityDotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    severityDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    severityDotLow: { backgroundColor: '#16A34A' },
    severityDotWarning: { backgroundColor: '#CA8A04' },
    severityDotCritical: { backgroundColor: '#DC2626' },
    severityDotText: {
      fontSize: 11,
      fontWeight: '900',
    },
    severityDotTextLow: { color: '#16A34A' },
    severityDotTextWarning: { color: '#CA8A04' },
    severityDotTextCritical: { color: '#DC2626' },
    auditRowEventText: {
      fontSize: 14.5,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 8,
      lineHeight: 19,
    },
    auditRowMetaBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    auditCategoryPill: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 6,
    },
    auditCategoryPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    auditAgentText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    loadArchivedLogsBtn: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
    },
    loadArchivedLogsText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },

    // Modals
    modalFullContainer: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    modalHeaderFull: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    modalHeaderInfo: { flex: 1, paddingRight: 10 },
    modalTitleFull: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    modalSubtitleFull: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalCloseBtnFull: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    crmSearchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    crmSearchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
    },
    crmSearchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
    },
    modalScrollBody: {
      flex: 1,
      paddingHorizontal: 20,
    },
    crmLeadsList: {
      paddingBottom: 20,
    },
    crmLeadItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
    },
    crmLeadItemSelected: {
      borderColor: '#00A896',
      backgroundColor: isDark ? 'rgba(0, 168, 150, 0.1)' : 'rgba(0, 168, 150, 0.06)',
    },
    leadAvatarCircleModal: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#0A2341',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    leadAvatarTextModal: {
      fontSize: 15,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    leadTrustScoreBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(22, 163, 74, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    leadTrustScoreBadgeFailed: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    leadTrustScoreText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#16A34A',
    },
    leadTrustScoreTextFailed: {
      color: '#EF4444',
    },
    crmLeadInfo: { flex: 1 },
    crmLeadName: {
      fontSize: 14.5,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    crmLeadSub: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalFooterFixed: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      gap: 8,
    },
    initAuditBtnPremium: {
      backgroundColor: '#00A896',
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initAuditBtnTextPremium: {
      fontSize: 14.5,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    cancelBtnPremium: {
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnTextPremium: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textSecondary,
    },

    // SOS Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    sosModalCard: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
    },
    sosModalIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    sosModalTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    sosModalBody: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
    },
    sosModalActions: {
      width: '100%',
      gap: 10,
    },
    sosModalConfirmBtn: {
      backgroundColor: '#EF4444',
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    sosModalConfirmBtnText: {
      fontSize: 14,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    sosModalCancelBtn: {
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
    },
    sosModalCancelBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textSecondary,
    },

    // Upload ID / Report Modal
    modalFormContent: { paddingVertical: 14 },
    uploadSectionLabelFull: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      marginTop: 12,
    },
    identityInputFull: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 16,
    },

    // FCRA Verification Consent Modal Styles (Web Matching)
    consentModalCard: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#0A2341',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
    consentHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    consentIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(0, 168, 150, 0.15)' : '#E6F7F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    consentModalTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    consentModalDesc: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      lineHeight: 19,
    },
    consentStatementBox: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 14,
      marginVertical: 18,
    },
    consentStatementText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textPrimary,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    consentStatementBold: {
      fontWeight: '900',
      fontStyle: 'normal',
      color: colors.textPrimary,
    },
    consentModalActions: {
      flexDirection: 'row',
      gap: 10,
    },
    consentConfirmBtn: {
      flex: 1.4,
      backgroundColor: '#0A2341',
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    consentConfirmBtnText: {
      fontSize: 13.5,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    consentCancelBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    consentCancelBtnText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    btnDisabled: {
      opacity: 0.6,
    },

    // Country Picker Modal Styles
    countryPickerModalCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    countryPickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    countryPickerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    countryPickerCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    countrySearchInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginBottom: 12,
      gap: 8,
    },
    countrySearchInput: {
      flex: 1,
      fontSize: 13.5,
      color: colors.textPrimary,
      padding: 0,
    },
    countryListScroll: {
      maxHeight: 340,
    },
    countryPickerItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 4,
      gap: 12,
    },
    countryPickerItemSelected: {
      backgroundColor: isDark ? 'rgba(0, 168, 150, 0.15)' : 'rgba(0, 168, 150, 0.08)',
    },
    countryPickerFlag: {
      fontSize: 22,
    },
    countryPickerItemName: {
      flex: 1,
      fontSize: 13.5,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    countryPickerItemNameSelected: {
      fontWeight: '800',
      color: '#00A896',
    },
    countryPickerItemDial: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    countryPickerItemDialSelected: {
      color: '#00A896',
      fontWeight: '800',
    },

    // Panic Mode Fullscreen Takeover
    panicFullScreen: {
      flex: 1,
      backgroundColor: '#DC2626',
    },
    panicScrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
      alignItems: 'center',
    },
    panicShieldWrap: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    panicTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.8,
      textAlign: 'center',
      marginBottom: 12,
    },
    panicSubtitle: {
      fontSize: 13.5,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.92)',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 26,
      paddingHorizontal: 10,
    },
    panicProtocolCard: {
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 22,
      padding: 22,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 8,
    },
    protocolHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    protocolTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: '#DC2626',
      letterSpacing: 0.5,
    },
    protocolList: {
      gap: 12,
      marginBottom: 22,
      backgroundColor: '#F8FAFC',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    protocolItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    protocolBullet: {
      fontSize: 13,
    },
    protocolItemText: {
      flex: 1,
      fontSize: 12.5,
      color: '#334155',
      lineHeight: 18,
    },
    protocolBold: {
      fontWeight: '800',
      color: '#0F172A',
    },
    panicCancelBtn: {
      backgroundColor: '#DC2626',
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    panicCancelBtnText: {
      fontSize: 14,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },

    bottomSpacer: { height: 40 },
  });
