import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle } from './Icons';
import { useStreamChat } from './StreamChatProvider';
import { Channel, MessageList, MessageInput, Thread, Window } from 'stream-chat-react';
import GlassCard from './GlassCard';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  studentId: string;
  studentName?: string;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  teacherId,
  studentId,
  studentName = 'Student'
}) => {
  const { createChannel, connectUser, isConnected } = useStreamChat();
  const [channel, setChannel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && teacherId && studentId) {
      initializeChat();
    }
  }, [isOpen, teacherId, studentId]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);

      // Connect teacher user if not already connected
      if (!isConnected) {
        await connectUser(teacherId, 'Teacher');
      }

      // Create or get existing channel (this already watches the channel)
      const chatChannel = await createChannel(teacherId, studentId);
      setChannel(chatChannel);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    } finally {
      setIsLoading(false);
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
            className="w-full max-w-2xl h-[80vh] max-h-[600px] bg-background-primary rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-primary/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-purple-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Chat with {studentName}
                  </h3>
                  <p className="text-sm text-text-muted">Student ID: {studentId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex flex-col" style={{ height: 'calc(100% - 80px)' }}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-purple-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-text-muted">Connecting to chat...</p>
                  </div>
                </div>
              ) : channel ? (
                <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
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
                  <Channel channel={channel} theme="messaging dark">
                    <Window>
                      <MessageList />
                      <MessageInput />
                    </Window>
                    <Thread />
                  </Channel>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-text-muted">Failed to load chat</p>
                    <button
                      onClick={initializeChat}
                      className="mt-2 px-4 py-2 bg-purple-primary text-white rounded-lg hover:bg-purple-dark transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatModal;
