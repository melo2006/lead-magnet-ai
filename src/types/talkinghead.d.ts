declare module "@met4citizen/talkinghead" {
  export interface TalkingHeadMorphState {
    realtime: number | null;
    needsUpdate: boolean;
  }

  export interface TalkingHeadInitOptions {
    cameraView?: string;
    cameraDistance?: number;
    cameraX?: number;
    cameraY?: number;
    cameraRotateX?: number;
    cameraRotateY?: number;
    cameraRotateEnable?: boolean;
    cameraPanEnable?: boolean;
    cameraZoomEnable?: boolean;
    modelPixelRatio?: number;
    modelFPS?: number;
    lightAmbientIntensity?: number;
    lightDirectIntensity?: number;
    lightDirectPhi?: number;
    lightDirectTheta?: number;
    lipsyncModules?: string[];
    avatarIdleEyeContact?: number;
    avatarIdleHeadMove?: number;
    avatarSpeakingEyeContact?: number;
    avatarSpeakingHeadMove?: number;
  }

  export interface TalkingHeadAvatarOptions {
    url: string;
    body?: "M" | "F";
    lipsyncLang?: string;
    avatarMood?: string;
    avatarIdleEyeContact?: number;
    avatarIdleHeadMove?: number;
    avatarSpeakingEyeContact?: number;
    avatarSpeakingHeadMove?: number;
  }

  export class TalkingHead {
    constructor(node: HTMLElement, options?: TalkingHeadInitOptions);
    showAvatar(avatar: TalkingHeadAvatarOptions): Promise<void>;
    setView?(view: string, options?: Record<string, number>): void;
    lookAtCamera?(duration: number): void;
    makeEyeContact?(duration: number): void;
    start?(): void;
    stop?(): void;
    mtAvatar?: Record<string, TalkingHeadMorphState>;
  }
}