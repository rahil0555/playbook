import type { VoiceErrorKind } from './recognizer';

/**
 * Why a voice answer did not happen. Each one has its own message and its own fix, so a child or a grown-up is not sent to
 * the wrong setting. Only the browser's error name and the page's own settings are read here: never audio, never a transcript.
 */
export type VoiceFailure =
  | 'unsupported'
  | 'insecure'
  | 'embedded'
  | 'site-blocked'
  | 'refused'
  | 'no-microphone'
  | 'speech-service'
  | 'not-started'
  | 'network'
  | 'no-speech'
  | 'unclear';

/** What the page's settings say about the microphone. Each field is 'unknown' where the browser does not report it. */
export interface VoiceEnvironment {
  /** window.isSecureContext: an https page or localhost. Speech recognition needs one. */
  secureContext: boolean;
  /** the page is inside another page (an iframe) */
  framed: boolean;
  /** the page's permissions policy for the microphone */
  policy: 'allowed' | 'blocked' | 'unknown';
  /** the browser's microphone permission for this page */
  permission: PermissionState | 'unknown';
  /** the browser has a speech recognition API at all */
  hasSpeechApi: boolean;
  /** which browser and system; not personal, and it says nothing about what the child said */
  userAgent: string;
}

interface PolicyApi {
  allowsFeature?: (feature: string) => boolean;
}

/**
 * Reads the page's settings that decide whether the browser may use the microphone. It asks for no permission and starts no
 * recognition, so it cannot cause a prompt or open the microphone.
 */
export async function describeVoiceEnvironment(win: Window = window, nav: Navigator = navigator): Promise<VoiceEnvironment> {
  let framed = true;
  try {
    framed = win.top !== win.self;
  } catch {
    framed = true;
  }
  let policy: VoiceEnvironment['policy'] = 'unknown';
  try {
    const doc = win.document as unknown as { permissionsPolicy?: PolicyApi; featurePolicy?: PolicyApi };
    const api = doc.permissionsPolicy ?? doc.featurePolicy;
    if (api?.allowsFeature) policy = api.allowsFeature('microphone') ? 'allowed' : 'blocked';
  } catch {
    policy = 'unknown';
  }
  let permission: VoiceEnvironment['permission'] = 'unknown';
  try {
    if (nav.permissions) permission = (await nav.permissions.query({ name: 'microphone' as PermissionName })).state;
  } catch {
    permission = 'unknown';
  }
  const w = win as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return {
    secureContext: win.isSecureContext === true,
    framed,
    policy,
    permission,
    hasSpeechApi: Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition),
    userAgent: nav.userAgent,
  };
}

/**
 * Why the browser refused the microphone. "Refused" can come from the page itself (not secure), from a frame that may not use
 * the microphone, from a site setting, or from the browser or the device. The page's settings tell these apart; the error name
 * alone cannot.
 */
export function refusalFor(env: VoiceEnvironment): VoiceFailure {
  if (!env.secureContext) return 'insecure';
  // inside another page: the frame's own permission can read "denied" because the parent page did not allow the microphone
  if (env.framed && (env.policy === 'blocked' || (env.policy === 'unknown' && env.permission === 'denied'))) return 'embedded';
  if (env.permission === 'denied') return 'site-blocked';
  return 'refused';
}

/**
 * The failure a recognition error means. Without the page's settings (not read yet), a refusal is "refused" until they are.
 */
export function failureFor(kind: VoiceErrorKind, env: VoiceEnvironment | null): VoiceFailure {
  switch (kind) {
    case 'unsupported':
      return 'unsupported';
    case 'permission':
      return env ? refusalFor(env) : 'refused';
    case 'no-microphone':
      return 'no-microphone';
    case 'speech-service':
      return 'speech-service';
    case 'not-started':
      // speech recognition cannot start on a page that is not secure, and some browsers then report nothing at all
      return env && !env.secureContext ? 'insecure' : 'not-started';
    case 'network':
      return 'network';
    case 'no-speech':
      return 'no-speech';
    default:
      return 'unclear';
  }
}

/**
 * One diagnostic line: the browser's error name, the failure it was taken to mean, and the page's settings. It holds no audio,
 * no transcript and nothing the child said, so it can be shared with a grown-up or a developer.
 */
export function logVoiceFailure(error: string, kind: VoiceErrorKind, reason: VoiceFailure, env: VoiceEnvironment | null): void {
  console.warn('[PlayLab voice] speech recognition gave no answer', { error, kind, reason, environment: env });
}
