export type StoryViewerTab = 'discover' | 'friends';

export type ViewerGroup = { title: string; authorId?: string; authorAvatar?: string | null; stories: unknown[] };

export type StoryViewerSession =
  | ViewerGroup[]
  | {
      activeTab?: StoryViewerTab;
      discoverGroups?: ViewerGroup[];
      friendGroups?: ViewerGroup[];
      groups?: ViewerGroup[];
    };

const sessions = new Map<string, StoryViewerSession>();
const MAX_SESSIONS = 10;

export const createStoryViewerSession = (session: StoryViewerSession) => {
  const id = `stories-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(id, session);
  while (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value!);
  return id;
};

export const getStoryViewerSession = (id?: string) => id ? sessions.get(id) : undefined;
