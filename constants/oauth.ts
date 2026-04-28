import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

// 번들 ID에서 스킴 추출 (마지막 세그먼트 타임스탬프, "manus" 접두사)
const bundleId = "space.manus.stockchart.analyzer.t20260331015323";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

/**
 * API 기본 URL을 가져옵니다. 
 * 설정되지 않은 경우 현재 환경(웹/안드로이드/iOS)에 맞춰 똑똑하게 자동 설정됩니다.
 */
export function getApiBaseUrl(): string {
  // 1. .env 파일에 API_BASE_URL이 명시적으로 설정되어 있으면 그것을 최우선으로 사용합니다.
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  // 2. 웹(Web) 환경일 경우 현재 브라우저 주소 기반으로 설정 (8081 포트를 3000 포트로 변경)
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  // 3. 💡 [LD플레이어 완벽 대응] 무한 로딩 방지를 위해 PC의 진짜 내부 IP를 하드코딩합니다.
  // 이전에 에러 화면에서 확인된 192.168.0.5를 사용합니다. 
  // (만약 PC의 와이파이/랜선 IP가 바뀌었다면 이 부분의 숫자를 바꿔주셔야 합니다.)
  if (__DEV__) {
    return "http://192.168.0.5:3000"; 
  }

  // 폴백(Fallback): 빈 문자열 반환 (상대 경로 사용)
  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

/**
 * OAuth 콜백을 위한 리다이렉트 URI를 가져옵니다.
 * - Web: API 서버의 콜백 엔드포인트 사용
 * - Native: 앱의 딥링크 스킴 사용
 */
export const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") {
    return `${getApiBaseUrl()}/api/oauth/callback`;
  } else {
    return Linking.createURL("/oauth/callback", {
      scheme: env.deepLinkScheme,
    });
  }
};

export const getLoginUrl = () => {
  const redirectUri = getRedirectUri();
  const state = encodeState(redirectUri);

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * OAuth 로그인 흐름을 시작합니다.
 *
 * 네이티브(iOS/Android)에서는 시스템 브라우저를 열어
 * OAuth 콜백이 딥링크를 통해 앱으로 돌아오게 합니다.
 * 웹에서는 단순히 로그인 URL로 리다이렉트합니다.
 */
export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = getLoginUrl();

  if (ReactNative.Platform.OS === "web") {
    // 웹 환경에서는 즉시 리다이렉트
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
    }
    return null;
  }

  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) {
    console.warn("[OAuth] 로그인 URL을 열 수 없습니다: 지원되지 않는 URL 스킴");
    return null;
  }

  try {
    await Linking.openURL(loginUrl);
  } catch (error) {
    console.error("[OAuth] 로그인 URL 열기 실패:", error);
  }

  return null;
}