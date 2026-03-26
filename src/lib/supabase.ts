import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Running in local-only mode.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Auth Helper Functions

export async function signUp(email: string, password: string, name: string) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name }
    }
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback: (user: any) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => { } } } };
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
}

// Database Helper Functions

export async function getChats() {
  if (!supabase) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('chats')
    .select('*, chat_tags(tag_id, tags(*))')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
  
  return (data || []).map(chat => ({
    ...chat,
    tags: chat.chat_tags ? chat.chat_tags.map((ct: any) => ct.tags).filter(Boolean) : []
  }));
}

export async function createChat(title: string = 'New Chat') {
  if (!supabase) return { id: Date.now().toString(), title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

  const user = await getCurrentUser();
  if (!user) {
    console.error('User must be logged in to create a chat');
    return null;
  }

  const { data, error } = await supabase
    .from('chats')
    .insert({ title, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('Error creating chat:', error);
    return null;
  }
  
  return { ...data, tags: [] };
}

export async function updateChatTitle(chatId: string, title: string) {
  if (!supabase) return;
  const user = await getCurrentUser();
  if (!user) return;
  
  await supabase
    .from('chats')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', chatId);
}

// Generate a random share ID
function generateShareId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// Share a chat and get the share link
export async function shareChat(chatId: string): Promise<string | null> {
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  // Check if already shared
  const { data: existing } = await supabase
    .from('chats')
    .select('share_id')
    .eq('id', chatId)
    .single();

  if (existing?.share_id) {
    return existing.share_id;
  }

  // Create new share ID
  const shareId = generateShareId();
  const { error } = await supabase
    .from('chats')
    .update({ share_id: shareId, is_public: true })
    .eq('id', chatId);

  if (error) {
    console.error('Error sharing chat:', error);
    return null;
  }

  return shareId;
}

// Get a shared chat by share ID
export async function getSharedChat(shareId: string) {
  if (!supabase) return null;

  const { data: chat, error } = await supabase
    .from('chats')
    .select('*')
    .eq('share_id', shareId)
    .eq('is_public', true)
    .single();

  if (error || !chat) {
    console.error('Error fetching shared chat:', error);
    return null;
  }

  return chat;
}

// Get messages for a shared chat
export async function getSharedChatMessages(shareId: string) {
  if (!supabase) return [];

  const chat = await getSharedChat(shareId);
  if (!chat) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chat.id)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching shared messages:', error);
    return [];
  }

  return { chat, messages: data || [] };
}

export async function getMessages(chatId: string) {
  if (!supabase) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return data || [];
}

export async function saveMessage(message: {
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used: string;
}) {
  if (!supabase) return message;
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      ...message,
      timestamp: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving message:', error);
    return null;
  }

  // Update chat's updated_at timestamp
  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', message.chat_id);

  return data;
}

export async function getTags() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
  return data || [];
}

export async function createTag(name: string, color: string) {
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tags')
    .insert({ name: name.trim(), color })
    .select()
    .single();

  if (error) {
    console.error('Error creating tag:', error);
    return null;
  }
  return data;
}

export async function deleteTag(tagId: string) {
  if (!supabase) return;
  const user = await getCurrentUser();
  if (!user) return;

  // Delete from chat_tags first (cascade should handle, but be safe)
  await supabase.from('chat_tags').delete().eq('tag_id', tagId);
  await supabase.from('tags').delete().eq('id', tagId);
}

export async function addTagToChat(chatId: string, tagId: string) {
  if (!supabase) return;
  const user = await getCurrentUser();
  if (!user) return;
  
  await supabase
    .from('chat_tags')
    .insert({ chat_id: chatId, tag_id: tagId });
}

export async function removeTagFromChat(chatId: string, tagId: string) {
  if (!supabase) return;
  const user = await getCurrentUser();
  if (!user) return;

  await supabase
    .from('chat_tags')
    .delete()
    .eq('chat_id', chatId)
    .eq('tag_id', tagId);
}

export async function searchChats(query: string) {
  if (!supabase) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('chat_id, content, chats(title)')
    .ilike('content', `%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching:', error);
    return [];
  }
  return data || [];
}

// ========== MEMORIES ==========

export async function saveMemory(key: string, value: string) {
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  // Upsert: if same key exists, update the value
  const { data: existing } = await supabase
    .from('memories')
    .select('id')
    .eq('user_id', user.id)
    .eq('key', key)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('memories')
      .update({ value })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) console.error('Error updating memory:', error);
    return data;
  }

  const { data, error } = await supabase
    .from('memories')
    .insert({ user_id: user.id, key, value })
    .select()
    .single();

  if (error) {
    console.error('Error saving memory:', error);
    return null;
  }
  return data;
}

export async function getMemories() {
  if (!supabase) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
  return data || [];
}

export async function deleteMemory(memoryId: string) {
  if (!supabase) return;
  const user = await getCurrentUser();
  if (!user) return;

  await supabase.from('memories').delete().eq('id', memoryId).eq('user_id', user.id);
}

// ========== USER PROFILES (Avatars) ==========

export async function getUserProfile() {
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
  }
  return data;
}

export async function updateAvatar(avatarId: number) {
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  // Upsert profile
  const existing = await getUserProfile();
  if (existing) {
    const { data } = await supabase
      .from('user_profiles')
      .update({ avatar_id: avatarId })
      .eq('user_id', user.id)
      .select()
      .single();
    return data;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({ user_id: user.id, avatar_id: avatarId })
    .select()
    .single();

  if (error) {
    console.error('Error updating avatar:', error);
    return null;
  }
  return data;
}
