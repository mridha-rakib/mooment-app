import { api } from "@/lib/api";

export type LiveRoomStatus = "live" | "ended";

export type LiveRoomViewerPermissions = {
  isHost: boolean;
  canSpeak: boolean;
  canManagePermissions: boolean;
};

export type LiveRoomUser = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
};

export type LiveRoomParticipant = {
  id: string;
  user: LiveRoomUser | null;
  isActive: boolean;
  canSpeak: boolean;
  isHost: boolean;
  joinedAt: string;
  leftAt?: string | null;
};

export type LiveRoomMessage = {
  id: string;
  liveRoomId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type LiveRoom = {
  id: string;
  hostUserId: string;
  host: LiveRoomUser | null;
  title: string;
  allowAllParticipantsToSpeak: boolean;
  speakerIds: string[];
  listenerCount: number;
  participants: LiveRoomParticipant[];
  status: LiveRoomStatus;
  viewerPermissions: LiveRoomViewerPermissions;
  createdAt: string;
  updatedAt: string;
};

export type CreateLiveRoomPayload = {
  title: string;
  allowAllParticipantsToSpeak: boolean;
  speakerIds?: string[];
};

export type UpdateLiveRoomPermissionsPayload = {
  allowAllParticipantsToSpeak?: boolean;
  speakerIds?: string[];
};

const getLiveRoomFromResponse = (response: unknown): LiveRoom => {
  const liveRoom = (response as { data?: { data?: { liveRoom?: LiveRoom } } })?.data?.data?.liveRoom;

  if (!liveRoom) {
    throw new Error("The live room response was incomplete.");
  }

  return liveRoom;
};

export const createLiveRoom = async (payload: CreateLiveRoomPayload): Promise<LiveRoom> => {
  const response = await api.post("/live-rooms", payload);

  return getLiveRoomFromResponse(response);
};

export const getLiveRoom = async (liveRoomId: string): Promise<LiveRoom> => {
  const response = await api.get(`/live-rooms/${encodeURIComponent(liveRoomId)}`);

  return getLiveRoomFromResponse(response);
};

export const joinLiveRoom = async (liveRoomId: string): Promise<LiveRoom> => {
  const response = await api.post(`/live-rooms/${encodeURIComponent(liveRoomId)}/join`);

  return getLiveRoomFromResponse(response);
};

export const leaveLiveRoom = async (liveRoomId: string): Promise<LiveRoom> => {
  const response = await api.post(`/live-rooms/${encodeURIComponent(liveRoomId)}/leave`);

  return getLiveRoomFromResponse(response);
};

export const updateLiveRoomPermissions = async (
  liveRoomId: string,
  payload: UpdateLiveRoomPermissionsPayload,
): Promise<LiveRoom> => {
  const response = await api.patch(`/live-rooms/${encodeURIComponent(liveRoomId)}/permissions`, payload);

  return getLiveRoomFromResponse(response);
};

export const getLiveRoomMessages = async (
  liveRoomId: string,
  options?: { before?: string; limit?: number },
): Promise<LiveRoomMessage[]> => {
  const response = await api.get(`/live-rooms/${encodeURIComponent(liveRoomId)}/messages`, {
    params: options,
  });
  const messages = response.data?.data?.messages;

  return Array.isArray(messages) ? (messages as LiveRoomMessage[]) : [];
};

export const createLiveRoomMessage = async (liveRoomId: string, text: string): Promise<LiveRoomMessage> => {
  const response = await api.post(`/live-rooms/${encodeURIComponent(liveRoomId)}/messages`, { text });
  const message = response.data?.data?.message;

  if (!message) {
    throw new Error("The live room message response was incomplete.");
  }

  return message as LiveRoomMessage;
};
