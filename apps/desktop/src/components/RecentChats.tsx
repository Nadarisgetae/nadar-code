import { useState, useEffect } from 'react';
import { MessageSquarePlus, MessageSquare } from 'lucide-react';

interface Chat {
  id: string;
  title: string;
  timestamp: number;
}

interface RecentChatsProps {
  onChatSwitch: (history: any[]) => void;
  cwd: string;
}

export default function RecentChats({ onChatSwitch, cwd }: RecentChatsProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const nadar = (window as any).nadar;

  const loadChats = async () => {
    if (nadar) {
      const list = await nadar.listChats();
      setChats(list);
    }
  };

  useEffect(() => {
    loadChats();
    // Poll for new chats every 5s while in same folder
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, [cwd]);

  const handleNewChat = async () => {
    if (nadar) {
      await nadar.newChat();
      onChatSwitch([]);
      loadChats();
    }
  };

  const handleSwitchChat = async (id: string) => {
    if (nadar) {
      const history = await nadar.switchChat(id);
      onChatSwitch(history);
    }
  };

  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ padding: '0 12px', marginBottom: 12 }}>
        <button 
          onClick={handleNewChat}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '6px',
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text-0)',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          <MessageSquarePlus size={14} />
          New Chat
        </button>
      </div>

      <div style={{ padding: '0 12px', marginBottom: 8, fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Chats and tasks
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {chats.length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-2)', fontStyle: 'italic' }}>
            No recent chats
          </div>
        ) : (
          chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => handleSwitchChat(chat.id)}
              className="chat-list-item"
              style={{
                padding: '6px 12px',
                fontSize: 13,
                color: 'var(--text-1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={chat.title}
            >
              <MessageSquare size={14} style={{ flexShrink: 0, color: 'var(--text-2)' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.title}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
