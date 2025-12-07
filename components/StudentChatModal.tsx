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

      let channelQueryResponse: any[] = [];

      // First, try to query channels where the student is a member
      try {
        const channelFilters = {
          type: 'messaging',
          members: { $in: [studentId] }
        };

        const channelSort = [{ last_message_at: -1 }];

        channelQueryResponse = await client.queryChannels(channelFilters, channelSort, {
          watch: true,
          state: true,
        });
      } catch (queryError: any) {
        console.warn('Channel query failed, trying direct channel access:', queryError);
        // If query fails (e.g., error code 70 - access denied), try to get channel directly by ID
      }

      // If no channels found via query, try to get the specific channel by ID
      // This handles the case where teacher created the channel but student hasn't been added as member yet
      if (channelQueryResponse.length === 0) {
        const channelId = `teacher-${teacherId}-student-${studentId}`;
        try {
          const existingChannel = client.channel('messaging', channelId);

          // Try to watch the channel - this will fail if it doesn't exist or student doesn't have access
          await existingChannel.watch();

          // Check if student is a member
          const currentMembers = existingChannel.state?.members || {};
          const memberIds = Object.keys(currentMembers);

          if (!memberIds.includes(studentId)) {
            // Student is not a member, try to add them
            try {
              await existingChannel.addMembers([studentId]);
              // Watch again after adding member
              await existingChannel.watch();
            } catch (addError) {
              console.warn('Could not add student to channel:', addError);
              // Continue anyway - the channel might still be accessible
            }
          }

          // If we successfully watched the channel, add it to the list
          if (existingChannel.state?.initialized) {
            channelQueryResponse = [existingChannel];
          }
        } catch (directError: any) {
          console.log('Direct channel access failed (channel may not exist yet):', directError);
          // Channel doesn't exist yet - that's fine, student can create it
        }
      }

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

      // Create channel with teacher
      const newChannel = await createChannel(teacherId, studentId);

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
                        className={`p-4 cursor-pointer hover:bg-white/5 transition-colors border-l-2 ${activeChannel?.id === channel.id
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
                      /* ===== DARK THEME - MAIN CONTAINERS ===== */
                      .str-chat,
                      .str-chat__container,
                      .str-chat__channel,
                      .str-chat__main-panel,
                      .str-chat__message-list,
                      .str-chat__message-list-scroll,
                      .str-chat__list,
                      .str-chat__ul,
                      .str-chat__virtual-list,
                      .str-chat__thread {
                        background: #0a0a0a !important;
                      }
                      
                      .str-chat__channel {
                        height: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                      }
                      
                      .str-chat__main-panel {
                        flex: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        min-height: 0 !important;
                      }
                      
                      .str-chat__message-list {
                        flex: 1 !important;
                        overflow-y: auto !important;
                        padding: 16px !important;
                      }
                      
                      .str-chat__li {
                        margin-bottom: 8px !important;
                        background: transparent !important;
                      }
                      
                      /* ===== HIDE AVATARS ===== */
                      .str-chat__avatar,
                      .str-chat__avatar-image {
                        display: none !important;
                      }
                      
                      /* ===== MESSAGE CONTAINER ===== */
                      .str-chat__message,
                      .str-chat__message-simple,
                      .str-chat__message-inner {
                        background: transparent !important;
                        padding: 0 !important;
                      }
                      
                      /* ===== HIDE FLOATING ACTION BAR ===== */
                      .str-chat__message-options,
                      .str-chat__message-simple__actions,
                      .str-chat__message-actions-container,
                      .str-chat__message-reactions-button {
                        display: none !important;
                      }
                      
                      /* ===== MESSAGE BUBBLES ===== */
                      .str-chat__message-text,
                      .str-chat__message-bubble {
                        background: transparent !important;
                        border: none !important;
                      }
                      
                      .str-chat__message:not(.str-chat__message--me) .str-chat__message-text-inner {
                        background: #27272a !important;
                        color: #ffffff !important;
                        padding: 10px 14px !important;
                        border-radius: 18px 18px 18px 4px !important;
                        display: inline-block !important;
                        max-width: 300px !important;
                      }
                      
                      .str-chat__message--me .str-chat__message-text-inner {
                        background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
                        color: #ffffff !important;
                        padding: 10px 14px !important;
                        border-radius: 18px 18px 4px 18px !important;
                        display: inline-block !important;
                        max-width: 300px !important;
                      }
                      
                      .str-chat__message-text-inner p {
                        margin: 0 !important;
                        color: #ffffff !important;
                        line-height: 1.5 !important;
                        font-size: 14px !important;
                      }
                      
                      /* ===== TIMESTAMPS ===== */
                      .str-chat__message-data,
                      .str-chat__message-simple-timestamp {
                        font-size: 10px !important;
                        color: rgba(255, 255, 255, 0.4) !important;
                        margin-top: 2px !important;
                        display: inline-block !important;
                      }
                      
                      /* ===== HIDE SENDER NAME ===== */
                      .str-chat__message-sender-name {
                        display: none !important;
                      }
                      
                      /* ===== DATE SEPARATORS ===== */
                      .str-chat__date-separator {
                        margin: 20px 0 !important;
                        background: transparent !important;
                        display: flex !important;
                        justify-content: center !important;
                      }
                      
                      .str-chat__date-separator-line {
                        display: none !important;
                      }
                      
                      .str-chat__date-separator-date {
                        background: rgba(139, 92, 246, 0.15) !important;
                        color: #a78bfa !important;
                        font-size: 11px !important;
                        padding: 6px 14px !important;
                        border-radius: 14px !important;
                      }
                      
                      /* ===== READ RECEIPTS ===== */
                      .str-chat__message-status {
                        display: inline-flex !important;
                        align-items: center !important;
                        margin-left: 4px !important;
                      }
                      
                      .str-chat__message-status svg {
                        color: #6b7280 !important;
                        fill: #6b7280 !important;
                        width: 14px !important;
                        height: 14px !important;
                      }
                      
                      .str-chat__message-status--read svg {
                        color: #3b82f6 !important;
                        fill: #3b82f6 !important;
                      }
                      
                      /* ===== REACTIONS ===== */
                      .str-chat__reaction-list {
                        background: rgba(31, 31, 35, 0.9) !important;
                        border: none !important;
                        border-radius: 12px !important;
                        padding: 2px 6px !important;
                      }
                      
                      .str-chat__reaction-selector {
                        background: #1f1f23 !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        border-radius: 20px !important;
                        padding: 6px 10px !important;
                      }
                      
                      /* ===== MESSAGE INPUT ===== */
                      .str-chat__message-input {
                        background: #0a0a0a !important;
                        border: none !important;
                        border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
                        padding: 12px 16px !important;
                      }
                      
                      .str-chat__message-input-inner {
                        background: #18181b !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        border-radius: 22px !important;
                        display: flex !important;
                        align-items: center !important;
                        padding: 6px 8px 6px 14px !important;
                        gap: 8px !important;
                      }
                      
                      .str-chat__textarea {
                        flex: 1 !important;
                      }
                      
                      .str-chat__textarea textarea {
                        background: transparent !important;
                        color: #ffffff !important;
                        border: none !important;
                        outline: none !important;
                        padding: 6px 0 !important;
                        font-size: 14px !important;
                      }
                      
                      .str-chat__textarea textarea::placeholder {
                        color: rgba(255, 255, 255, 0.35) !important;
                      }
                      
                      .str-chat__file-input-container,
                      .str-chat__input-emojiselect {
                        color: rgba(255, 255, 255, 0.4) !important;
                        background: transparent !important;
                      }
                      
                      .str-chat__send-button {
                        background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
                        border: none !important;
                        border-radius: 50% !important;
                        width: 34px !important;
                        height: 34px !important;
                        min-width: 34px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                      }
                      
                      .str-chat__send-button svg {
                        fill: white !important;
                        width: 16px !important;
                        height: 16px !important;
                      }
                      
                      /* ===== SCROLLBAR ===== */
                      .str-chat__message-list::-webkit-scrollbar {
                        width: 5px !important;
                      }
                      
                      .str-chat__message-list::-webkit-scrollbar-track {
                        background: transparent !important;
                      }
                      
                      .str-chat__message-list::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.15) !important;
                        border-radius: 3px !important;
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
