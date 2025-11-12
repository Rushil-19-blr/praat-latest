import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Users } from './Icons';
import { useStreamChat } from './StreamChatProvider';
import { Channel, MessageList, MessageInput, Thread, Window } from 'stream-chat-react';

interface StudentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string;
}

const StudentChatModal: React.FC<StudentChatModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName = 'Student'
}) => {
  const { client, connectUser, isConnected, createChannel } = useStreamChat();
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  
  // Teacher ID (hardcoded - same as admin code)
  const teacherId = '9999';

  useEffect(() => {
    if (isOpen && studentId) {
      initializeStudentChat();
    }
  }, [isOpen, studentId]);

  const initializeStudentChat = async () => {
    try {
      setIsLoading(true);

      // Connect student user if not already connected
      if (!isConnected) {
        await connectUser(studentId, studentName);
      }

      // Query channels where the student is a member
      const channelFilters = {
        type: 'messaging',
        members: { $in: [studentId] }
      };

      const channelSort = [{ last_message_at: -1 }];

      const channelQueryResponse = await client.queryChannels(channelFilters, channelSort, {
        watch: true,
        state: true,
      });

      setChannels(channelQueryResponse);

      // Set the first channel as active if available
      if (channelQueryResponse.length > 0) {
        setActiveChannel(channelQueryResponse[0]);
      }
    } catch (error) {
      console.error('Failed to initialize student chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectChannel = (channel: any) => {
    setActiveChannel(channel);
  };

  const createNewChatWithTeacher = async () => {
    try {
      setIsCreatingChannel(true);

      // Connect student user if not already connected
      if (!isConnected) {
        await connectUser(studentId, studentName);
      }

      // Create channel with teacher (student as creator)
      const newChannel = await createChannel(teacherId, studentId, studentId);

      // Refresh channel list
      await initializeStudentChat();

      // Set the new channel as active
      setActiveChannel(newChannel);
    } catch (error) {
      console.error('Failed to create chat with teacher:', error);
      alert('Failed to start chat with teacher. Please try again.');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl h-[80vh] max-h-[600px] bg-background-primary rounded-2xl overflow-hidden shadow-2xl flex"
          >
            {/* Sidebar - Channel List */}
            <div className="w-80 border-r border-white/10 bg-surface/50 flex flex-col">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-primary/20 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Messages</h3>
                      <p className="text-sm text-text-muted">{channels.length} conversations</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={createNewChatWithTeacher}
                  disabled={isCreatingChannel}
                  className="w-full px-4 py-2 bg-purple-primary text-white rounded-lg hover:bg-purple-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingChannel ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Starting chat...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>Message Teacher</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="w-6 h-6 border-2 border-purple-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : channels.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 text-text-muted mx-auto mb-2" />
                      <p className="text-text-muted text-sm">No messages yet</p>
                      <p className="text-text-muted text-xs mt-1">Click "Message Teacher" above to start a conversation</p>
                    </div>
                  </div>
                ) : (
                  channels.map((channel) => {
                    // Get last message - try multiple ways to extract it
                    const lastMessageObj = channel.state?.last_message;
                    let lastMessage = '';
                    if (lastMessageObj) {
                      if (lastMessageObj.text) {
                        lastMessage = lastMessageObj.text;
                      } else if (lastMessageObj.attachments && lastMessageObj.attachments.length > 0) {
                        lastMessage = '📎 Attachment';
                      } else if (lastMessageObj.type) {
                        lastMessage = `[${lastMessageObj.type}]`;
                      }
                    }
                    
                    return (
                      <div
                        key={channel.id}
                        onClick={() => selectChannel(channel)}
                        className={`p-4 cursor-pointer hover:bg-white/5 transition-colors border-l-2 ${
                          activeChannel?.id === channel.id
                            ? 'border-purple-primary bg-purple-primary/10'
                            : 'border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-primary/20 rounded-full flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-purple-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {channel.data?.name || 'Teacher Chat'}
                            </p>
                            {lastMessage && (
                              <p className="text-xs text-text-muted truncate">
                                {lastMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-surface/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-primary/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-purple-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {activeChannel ? (activeChannel.data?.name || 'Teacher Chat') : 'Select a conversation'}
                    </h3>
                    <p className="text-sm text-text-muted">
                      {activeChannel ? 'Teacher' : 'Choose a chat from the sidebar'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
                {activeChannel ? (
                  <>
                    <style>{`
                      .str-chat__channel {
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        background: #000000 !important;
                      }
                      .str-chat__channel .str-chat__main-panel {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        min-height: 0;
                        background: #000000 !important;
                      }
                      .str-chat__message-list {
                        flex: 1;
                        overflow-y: auto;
                        min-height: 0;
                        background: #000000 !important;
                      }
                      .str-chat__message-list .str-chat__ul {
                        background: #000000 !important;
                      }
                      .str-chat__message-list-container {
                        background: #000000 !important;
                      }
                      .str-chat__message-simple {
                        background: transparent !important;
                      }
                      .str-chat__message {
                        background: transparent !important;
                      }
                      .str-chat__message-text-inner {
                        background: transparent !important;
                      }
                      .str-chat__message-bubble {
                        background: transparent !important;
                      }
                      .str-chat__message-input {
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        background: rgba(26, 26, 26, 0.8) !important;
                      }
                      .str-chat__input {
                        background: rgba(255, 255, 255, 0.1) !important;
                        border: 1px solid rgba(255, 255, 255, 0.2) !important;
                        color: #ffffff !important;
                      }
                      .str-chat__input textarea {
                        color: #ffffff !important;
                      }
                      .str-chat__textarea {
                        color: #ffffff !important;
                      }
                      .str-chat__textarea textarea {
                        color: #ffffff !important;
                      }
                      .str-chat__textarea__textarea {
                        color: #ffffff !important;
                      }
                      .str-chat__input::placeholder {
                        color: rgba(255, 255, 255, 0.5) !important;
                      }
                      .str-chat__input textarea::placeholder {
                        color: rgba(255, 255, 255, 0.5) !important;
                      }
                      .str-chat__send-button {
                        background: #8b5cf6;
                        color: white;
                      }
                      .str-chat__send-button:hover {
                        background: #7c3aed;
                      }
                    `}</style>
                    <Channel channel={activeChannel} theme="messaging dark">
                      <Window>
                        <MessageList />
                        <MessageInput />
                      </Window>
                      <Thread />
                    </Channel>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-white mb-2">Welcome to Messages</h4>
                      <p className="text-text-muted">Select a conversation to start chatting with your teachers.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StudentChatModal;
