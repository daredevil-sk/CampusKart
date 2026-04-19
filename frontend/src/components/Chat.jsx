import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  Search, MoreHorizontal, Send, Paperclip, Smile, Bell, Mail, X
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const Chat = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  const [chats, setChats] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const selectedChatRef = useRef(null);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // States for Attachment
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [chatsRes, notifRes] = await Promise.all([
          api.get('/messages/chats'),
          api.get('/messages/notifications')
        ]);
        setChats(chatsRes.data.data);
        setNotifications(notifRes.data.data);
        const queryParams = new URLSearchParams(location.search);
        const chatIdFromUrl = queryParams.get('id');
        if (chatIdFromUrl) {
          const found = chatsRes.data.data.find(c => c._id === chatIdFromUrl);
          if (found) setSelectedChat(found);
        }
      } catch (err) { console.error(err); }
    };
    fetchData();
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    newSocket.emit('user_online', user._id);
    return () => newSocket.disconnect();
  }, [user, location.search]);

  // 1. Global Socket Listeners (Notifications & Sidebar)
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMsg) => {
      const msgChatId = (newMsg.chat?._id || newMsg.chat).toString();

      setChats(prev => {
        const alreadyInList = prev.find(c => c._id.toString() === msgChatId);
        if (!alreadyInList) {
          api.get('/messages/chats').then(res => setChats(res.data.data));
          return prev;
        }
        return prev.map(c =>
          c._id.toString() === msgChatId
            ? { ...c, lastMessage: newMsg.content || 'Sent an attachment', updatedAt: new Date().toISOString() }
            : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });

      if (selectedChatRef.current && msgChatId === selectedChatRef.current._id.toString()) {
        const senderIdStr = newMsg.sender?._id?.toString() || newMsg.sender?.toString();
        const isMyOwnMessage = senderIdStr === user._id?.toString();
        if (!isMyOwnMessage) {
          setMessages((prev) => [...prev, newMsg]);
        }
      } else {
        api.get('/messages/notifications').then(res => setNotifications(res.data.data));
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('error', (err) => alert(err.message || 'Chat error occurred'));

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('error');
    };
  }, [socket]);

  // 2. Chat-Specific Logic (History & Room Joining)
  useEffect(() => {
    if (!selectedChat || !socket) return;

    const fetchHistory = async () => {
      try {
        const { data } = await api.get(`/messages/${selectedChat._id}/messages`);
        setMessages(data.data);
      } catch (err) { console.error(err); }
    };
    fetchHistory();
    socket.emit('join_room', { roomId: selectedChat._id, userId: user._id, type: 'chat' });

    const otherUser = selectedChat.participants.find(p => p._id !== user._id);
    if (otherUser) socket.emit('check_online', { userId: otherUser._id });

    const handleStatusChange = (data) => {
      if (otherUser && data.userId === otherUser._id) {
        setIsOtherUserOnline(data.status === 'online');
      }
    };

    socket.on('user_status_change', handleStatusChange);

    if (selectedChat) {
      setNotifications(prev => prev.filter(n => n.chat.toString() !== selectedChat._id.toString()));
    }

    return () => {
      socket.off('user_status_change', handleStatusChange);
    };
  }, [selectedChat, socket]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachment) return;

    // Sort chat to top immediately (Optimistic Sidebar Update)
    setChats(prev => prev.map(c => c._id === selectedChat._id ? { ...c, lastMessage: inputText || 'Sent an attachment', updatedAt: new Date().toISOString() } : c).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));

    let attachmentUrl = '';
    let isImage = false;

    // Handle File Attachment via ImageKit
    if (attachment) {
      const formData = new FormData();
      formData.append('file', attachment);
      try {
        const { data } = await api.post('/messages/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        attachmentUrl = data.url;
        isImage = attachment.type.startsWith('image/');
      } catch (err) {
        alert('File upload failed');
        return;
      }
    }

    const outgoingMsg = {
      chatId: selectedChat._id,
      chat: selectedChat._id,
      senderId: user._id,
      text: inputText,
      attachmentUrl,
      isImage,
      isAudio: false,
      // Optimistic fields for immediate UI update
      _id: `temp-${Date.now()}`,
      sender: { _id: user._id, name: user.name, profilePic: user.profilePic },
      content: inputText,
      createdAt: new Date().toISOString()
    };

    // Push instantly locally
    setMessages(prev => [...prev, outgoingMsg]);

    socket.emit('send_message', outgoingMsg);
    setInputText('');
    setAttachment(null);
  };

  const handleReport = async () => {
    if (!window.confirm('Do you want to report this user for inappropriate behavior? This will share the chat history with the admin.')) return;
    try {
      const res = await api.post('/messages/report', { chatId: selectedChat._id });
      if (res.data.success) {
        alert('User reported successfully. Admin will review the session.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Reporting failed.');
    }
    setShowOptions(false);
  };

  // Redundant with ProtectedRoute in App.jsx
  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[600px] w-full bg-transparent font-sans text-teal-50 overflow-hidden relative pt-5">

      {/* 1. Nav Sidebar */}
      <div className="w-20 bg-[#061014]/60 backdrop-blur-xl border-r border-teal-900/30 flex flex-col items-center py-8 gap-10 select-none">
        <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20 uppercase font-black text-xl cursor-default">
          {user.name?.[0] || 'U'}
        </div>
        <div className="flex flex-col items-center gap-8 text-teal-700">
          <Mail size={24} className="cursor-pointer text-teal-400" />
          <div className="relative group cursor-pointer" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={24} className="text-teal-700 group-hover:text-teal-400 transition" />
            {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-[#061014] pointer-events-none">{notifications.length}</span>}
          </div>
        </div>
      </div>

      {/* 2. Chats List */}
      <div className="w-[320px] bg-[#030a0d]/40 backdrop-blur-md border-r border-teal-900/20 flex flex-col">
        <div className="p-6 pb-2 text-teal-50">
          {/* Limits Info Section */}
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4 mb-6 animate-fade-in shadow-inner">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-2">Chatting Limits</h4>
            <ul className="text-[10px] text-teal-100/60 space-y-1 font-bold">
              <li className="flex items-center gap-2"><span>•</span> Max 100 words per message</li>
              <li className="flex items-center gap-2"><span>•</span> Max 50 messages per thread</li>
              <li className="flex items-center gap-2"><span>•</span> Max 50 active chat threads</li>
              <li className="flex items-center gap-2"><span>•</span> Max 1MB file upload limit</li>
            </ul>
          </div>

          <h2 className="text-2xl font-black text-teal-50 mb-6">Messages</h2>
          <div className="relative group mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-700 group-focus-within:text-teal-400 transition" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#050b0f] border border-teal-900/30 rounded-2xl py-3 pl-12 pr-4 text-sm text-teal-50 placeholder:text-teal-800 focus:ring-1 focus:ring-teal-500/30 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 mt-2">
          {chats.filter(chat => {
            const otherUser = chat.participants.find(p => p._id !== user._id);
            const searchStr = (otherUser?.name + (chat.product?.title || '')).toLowerCase();
            return searchStr.includes(searchTerm.toLowerCase());
          }).map((chat) => {
            const otherUser = chat.participants.find(p => p._id !== user._id);
            const isSelected = selectedChat?._id === chat._id;
            return (
              <div key={chat._id} onClick={() => setSelectedChat(chat)} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${isSelected ? 'bg-teal-500/10 text-teal-50 shadow-lg border border-teal-500/20' : 'hover:bg-white/5 text-teal-100/60'}`}>
                <div className="w-12 h-12 rounded-2xl bg-[#061014] border border-teal-900/30 flex items-center justify-center text-teal-400 flex-shrink-0 uppercase font-bold shadow-inner">{otherUser?.name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-bold text-sm truncate">{otherUser?.name}</h4>
                    {chat.product && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase truncate max-w-[80px] ${isSelected ? 'bg-teal-500 text-[#030a0d]' : 'bg-teal-900/30 text-teal-400 border border-teal-500/10'}`}>
                        {chat.product.title}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] truncate opacity-60 ${isSelected ? 'text-teal-200' : 'text-teal-900'}`}>{chat.lastMessage || 'Sent an attachment'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Main Chat View */}
      <div className="flex-1 flex flex-col bg-transparent">
        {selectedChat ? (
          <>
            <div className="px-10 py-4 border-b border-teal-900/10 flex items-center justify-between bg-[#061014]/60 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-900/30 border border-teal-500/20 flex items-center justify-center font-bold text-teal-400 uppercase shadow-inner shadow-teal-500/10">{selectedChat.participants.find(p => p._id !== user._id)?.name?.[0]}</div>
                <div>
                  <h3 className="text-lg font-black text-teal-50">{selectedChat.participants.find(p => p._id !== user._id)?.name}</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isOtherUserOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-teal-900'}`}></span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isOtherUserOnline ? 'text-green-500' : 'text-teal-800'}`}>
                        {isOtherUserOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {selectedChat.product && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-teal-900"></span>
                        <span className="text-[10px] font-black uppercase text-teal-400 bg-teal-900/20 px-2 py-0.5 rounded-md border border-teal-500/10 hover:border-teal-500/30 transition-colors">
                          Product: {selectedChat.product.title}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative">
                <MoreHorizontal
                  size={20}
                  className="text-teal-800 cursor-pointer hover:text-teal-400 transition"
                  onClick={() => setShowOptions(!showOptions)}
                />
                {showOptions && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#061014] border border-teal-900/50 rounded-xl shadow-2xl py-2 z-50 animate-fade-in backdrop-blur-2xl">
                    {selectedChat.participants.find(p => p._id !== user._id)?.role !== 'admin' && (
                      <button
                        onClick={handleReport}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition"
                      >
                        <X size={14} /> Report to Admin
                      </button>
                    )}
                    <button
                      onClick={() => setShowOptions(false)}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-teal-700 hover:bg-teal-500/5 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 lg:px-10 py-6 space-y-2.5 bg-transparent custom-scrollbar">
              {messages.map((msg, idx) => {
                const isMe = msg.sender?._id === user._id || msg.sender === user._id;
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`relative px-3 py-2 rounded-2xl max-w-[85%] sm:max-w-[70%] text-[14px] shadow-lg flex flex-col ${isMe ? 'bg-teal-600 text-white rounded-br-none border border-teal-500/30' : 'bg-[#061014]/80 text-teal-50 rounded-bl-none border border-teal-900/40 backdrop-blur-md'}`}>

                      {/* Render media content */}
                      {msg.attachmentUrl && (
                        <div className={`rounded-lg overflow-hidden ${msg.content ? 'mb-1.5' : ''} ${msg.isImage ? '' : 'border border-teal-900/20'}`}>
                          {msg.isImage ? (
                            <img src={msg.attachmentUrl} className="max-w-full sm:max-w-sm max-h-64 object-cover cursor-pointer rounded-lg hover:scale-[1.02] transition-transform" onClick={() => window.open(msg.attachmentUrl, '_blank')} />
                          ) : (
                            <a href={msg.attachmentUrl} target="_blank" className="bg-[#030a0d] p-2.5 rounded-lg flex items-center gap-2 text-[12px] font-bold text-teal-400 hover:text-teal-200 transition">
                              <Paperclip size={16} /> View Document
                            </a>
                          )}
                        </div>
                      )}

                      {/* Render text content mixed with timestamp */}
                      <div className="flex items-end justify-between flex-wrap gap-x-3 gap-y-1">
                        {msg.content && <span className="whitespace-pre-wrap leading-tight text-[13px] sm:text-[14px] font-medium">{msg.content}</span>}
                        <span className={`text-[9px] font-bold min-w-max ml-auto text-right self-end translate-y-[2px] ${isMe ? 'text-teal-100' : 'text-teal-700'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar with Profile Attachments and Mic */}
            <div className="p-6 pt-4 bg-transparent">
              {attachment && (
                <div className="mb-4 bg-teal-900/20 border border-teal-500/20 p-2 rounded-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md">
                  <div className="w-10 h-10 bg-[#061014] rounded-xl flex items-center justify-center text-teal-400 shadow-sm overflow-hidden border border-teal-500/10">
                    {attachment.type.startsWith('image/') ? <img src={URL.createObjectURL(attachment)} className="w-full h-full object-cover" /> : <Paperclip size={18} />}
                  </div>
                  <span className="text-xs font-bold text-teal-100 truncate flex-1">{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} className="p-1 text-rose-400 hover:text-rose-300"><X size={16} /></button>
                </div>
              )}

              <div className="bg-[#061014]/70 backdrop-blur-2xl p-2.5 rounded-[2rem] flex items-center gap-2 border border-teal-900/40 shadow-2xl">
                <button onClick={() => fileInputRef.current.click()} className="p-3 text-teal-800 hover:text-teal-400 transition"><Paperclip size={20} /></button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setAttachment(e.target.files[0])} />

                <form onSubmit={handleSend} className="flex-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <input value={inputText} onChange={e => setInputText(e.target.value)} type="text" placeholder="Type a message here.." className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 outline-none text-teal-50 placeholder:text-teal-900 px-2" />

                    <button type="submit" disabled={!inputText.trim() && !attachment} className="bg-teal-600 text-white p-3.5 rounded-full hover:bg-teal-500 shadow-lg shadow-teal-500/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95">
                      <Send size={18} fill="currentColor" />
                    </button>
                  </div>
                  <span className="text-[8px] text-teal-900 px-2 font-bold uppercase tracking-wider">Max 100 words per query</span>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 bg-transparent text-center h-[calc(100vh-220px)] min-h-[500px]">
            <div className="w-20 h-20 bg-teal-900/20 rounded-full border border-teal-500/10 flex items-center justify-center text-teal-800 mb-6 shadow-2xl"><Mail size={40} /></div>
            <h3 className="text-xl font-black text-teal-50 mb-1">Select a conversation</h3>
            <p className="text-teal-800 text-sm font-medium tracking-wide">Pick a seller to start business</p>
          </div>
        )}
      </div>

      {/* 4. Notifications Bar (Slide Over) */}
      {showNotifications && (
        <div className="w-[320px] bg-[#061014]/90 backdrop-blur-2xl border-l border-teal-900/50 p-6 flex flex-col gap-6 shadow-2xl z-[60] absolute right-4 top-24 bottom-4 rounded-2xl animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-black text-teal-50">Recent Activity</h3>
            <button onClick={() => setShowNotifications(false)} className="p-1.5 hover:bg-rose-500/10 hover:text-rose-400 text-teal-900 rounded-full transition"><X size={20} /></button>
          </div>
          <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
            {notifications.length === 0 ? (
              <p className="text-sm text-teal-900 text-center mt-10 font-medium tracking-wide">No new notifications</p>
            ) : notifications.map((n, i) => {
              const chatToOpen = chats.find(c => c._id === n.chat.toString());
              return (
                <div key={i} className={`flex gap-3 cursor-pointer p-3 rounded-2xl transition-all border group ${n.isRead ? 'opacity-25 grayscale-[0.8] border-transparent scale-[0.98]' : (n.type === 'system' ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)] hover:bg-rose-500/20' : 'bg-teal-500/10 border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.1)] hover:bg-teal-500/20')}`} onClick={() => {
                  api.patch(`/messages/notifications/${n._id}/read`).catch(e => console.error(e));

                  if (n.type === 'system') {
                    if (user.role === 'admin') {
                      navigate('/admin', { state: { activeTab: 'reports', highlightReportId: n.chat } });
                      setShowNotifications(false);
                      return;
                    }
                    if (n.chat) {
                      const chatToOpen = chats.find(c => c._id === n.chat.toString());
                      if (chatToOpen) setSelectedChat(chatToOpen);
                      setShowNotifications(false);
                    }
                    return;
                  }

                  if (chatToOpen) {
                    setSelectedChat(chatToOpen);
                    setShowNotifications(false);
                  } else {
                    setSelectedChat({
                      _id: n.chat,
                      participants: [n.sender],
                      product: n.product,
                      lastMessage: ''
                    });
                    setShowNotifications(false);
                  }
                }}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs uppercase shadow-sm border flex-shrink-0 transition-all ${n.isRead ? 'bg-slate-900/50 text-slate-700 border-slate-800' : (n.type === 'system' ? 'bg-rose-500 text-[#030a0d] border-rose-400 rotate-12 scale-110 shadow-lg shadow-rose-900/40' : 'bg-teal-500 text-[#030a0d] border-teal-400 scale-110 shadow-lg shadow-teal-900/40 group-hover:scale-125')}`}>
                    {n.isRead ? '✓' : (n.type === 'system' ? '!' : (n.sender?.name?.[0] || '?'))}
                  </div>
                  <div className="min-w-0 flex-1">
                    {n.type === 'system' ? (
                      <p className={`text-[12px] leading-snug ${n.isRead ? 'text-slate-600 font-medium' : 'text-rose-100 font-black'}`}>
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-tighter mr-1.5 ${n.isRead ? 'bg-slate-800/50 text-slate-700 font-medium' : 'bg-rose-600 text-white font-black'}`}>SYSTEM</span>
                        {n.content}
                      </p>
                    ) : (
                      <p className={`text-[12px] leading-snug ${n.isRead ? 'text-slate-600 font-medium' : 'text-teal-50 font-bold'}`}>
                        <span className={`${n.isRead ? 'text-slate-600 font-medium' : 'text-teal-400 font-bold'}`}>@{n.sender?.name}</span> sent a message about <span className={n.isRead ? 'font-medium' : 'underline decoration-teal-900/50'}>{n.product?.title}</span>
                      </p>
                    )}
                    <span className={`text-[9px] font-black tracking-wider uppercase mt-1.5 block ${n.isRead ? 'text-slate-800 font-medium' : (n.type === 'system' ? 'text-rose-400/60' : 'text-teal-400/60')}`}>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {n.isRead && '• SEEN'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
