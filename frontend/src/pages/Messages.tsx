import { useEffect, useMemo, useState } from 'react';
import { api, type ChatMessage, type RecentChat } from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';

export function Messages() {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [chats, setChats] = useState<RecentChat[]>([]);
    const [selectedChat, setSelectedChat] = useState<RecentChat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [messageError, setMessageError] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setQuery(search.trim()), 250);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        let cancelled = false;
        const loadChats = async () => {
            setLoadingChats(true);
            setChatError(null);
            try {
                const data = await api.getRecentChats({ search: query || undefined, limit: 100 });
                if (!cancelled) {
                    const chatsData = data ?? [];
                    setChats(chatsData);
                    if (!selectedChat || !chatsData.find(chat => chat.chat_guid === selectedChat.chat_guid)) {
                        setSelectedChat(chatsData[0] ?? null);
                    }
                }
            } catch (err) {
                if (!cancelled) setChatError(err instanceof Error ? err.message : 'Failed to load chats');
            } finally {
                if (!cancelled) setLoadingChats(false);
            }
        };
        loadChats();
        return () => {
            cancelled = true;
        };
    }, [query, selectedChat]);

    useEffect(() => {
        if (!selectedChat) {
            setMessages([]);
            setLoadingMessages(false);
            setMessageError(null);
            return;
        }

        let cancelled = false;
        const loadMessages = async () => {
            setLoadingMessages(true);
            setMessageError(null);
            try {
                const data = await api.getChatMessages(selectedChat.chat_guid, { limit: 250 });
                if (!cancelled) setMessages(data ?? []);
            } catch (err) {
                if (!cancelled) setMessageError(err instanceof Error ? err.message : 'Failed to load messages');
            } finally {
                if (!cancelled) setLoadingMessages(false);
            }
        };
        loadMessages();

        return () => {
            cancelled = true;
        };
    }, [selectedChat?.chat_guid]);

    const filteredCount = useMemo(() => chats.length, [chats]);

    return (
        <div className="h-full overflow-hidden bg-bg0/50 p-8 flex flex-col gap-6">
            <div>
                <h1 className="text-4xl font-bold text-white mb-2">Messages</h1>
                <p className="text-muted">Search chats and inspect full message timelines.</p>
            </div>

            <div className="min-h-0 flex-1 grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
                <section className="rounded-2xl border border-stroke bg-panel/80 p-4 flex flex-col min-h-0">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search chats or participants"
                        className="w-full rounded-lg bg-bg1 border border-stroke px-3 py-2 text-sm text-white outline-none focus:border-cyan"
                    />
                    <div className="text-xs text-muted mt-2">{filteredCount} chats</div>

                    <div className="mt-4 space-y-2 overflow-y-auto pr-1">
                        {loadingChats && <LoadingState message="Loading chats..." className="text-muted text-sm" />}
                        {chatError && <ErrorState message={chatError} className="text-red-300 text-sm" />}
                        {!loadingChats && !chatError && chats.length === 0 && (
                            <EmptyState message="No chats matched your search." className="text-muted text-sm" />
                        )}

                        {chats.map(chat => {
                            const active = selectedChat?.chat_guid === chat.chat_guid;
                            return (
                                <button
                                    key={chat.chat_guid}
                                    onClick={() => setSelectedChat(chat)}
                                    className={`w-full text-left rounded-xl border px-3 py-2 transition ${
                                        active
                                            ? 'border-cyan bg-cyan/10'
                                            : 'border-stroke bg-bg1/70 hover:border-cyan/40'
                                    }`}
                                >
                                    <div className="text-sm font-semibold text-white truncate">{chat.display_names}</div>
                                    <div className="text-xs text-muted">{chat.msg_count.toLocaleString()} msgs {chat.badges || ''}</div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-2xl border border-stroke bg-panel/80 p-4 flex flex-col min-h-0">
                    <h2 className="text-lg text-white font-semibold mb-4 truncate">
                        {selectedChat ? selectedChat.display_names : 'Select a chat'}
                    </h2>
                    <div className="min-h-0 overflow-y-auto space-y-3 pr-1">
                        {!selectedChat && <EmptyState message="Choose a conversation to view messages." />}
                        {loadingMessages && <LoadingState message="Loading messages..." />}
                        {messageError && <ErrorState message={messageError} />}
                        {!loadingMessages && !messageError && selectedChat && messages.length === 0 && (
                            <EmptyState message="No messages found for this chat." />
                        )}

                        {messages.map(msg => (
                            <div
                                key={msg.row_id}
                                className={`max-w-[85%] rounded-xl border px-3 py-2 ${
                                    msg.is_from_me
                                        ? 'ml-auto bg-cyan/10 border-cyan/20'
                                        : 'bg-bg1/80 border-stroke'
                                }`}
                            >
                                <div className="text-xs text-muted mb-1">{msg.sender_name || (msg.is_from_me ? 'Me' : 'Unknown')} · {msg.date}</div>
                                <div className="text-sm text-white whitespace-pre-wrap break-words">{msg.text || '[No text]'}</div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
