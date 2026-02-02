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
  const { data, error } = await supabase
    .from('chats')
    .select('*, chat_tags(tag_id, tags(*))')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
  return data || [];
}

export async function createChat(title: string = 'New Chat') {
  if (!supabase) return { id: Date.now().toString(), title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('chats')
    .insert({ title })
    .select()
    .single();

  if (error) {
    console.error('Error creating chat:', error);
    return null;
  }
  return data;
}

export async function updateChatTitle(chatId: string, title: string) {
  if (!supabase) return;
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

export async function addTagToChat(chatId: string, tagId: string) {
  if (!supabase) return;
  await supabase
    .from('chat_tags')
    .insert({ chat_id: chatId, tag_id: tagId });
}

export async function removeTagFromChat(chatId: string, tagId: string) {
  if (!supabase) return;
  await supabase
    .from('chat_tags')
    .delete()
    .eq('chat_id', chatId)
    .eq('tag_id', tagId);
}

export async function searchChats(query: string) {
  if (!supabase) return [];
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
