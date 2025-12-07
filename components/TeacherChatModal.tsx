import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Users, Pencil } from './Icons';
import { useStreamChat } from './StreamChatProvider';
import { Channel, MessageList, MessageInput, Thread, Window } from 'stream-chat-react';

interface TeacherChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  students?: Array<{ code: string; name: string }>; // Optional list of students for display names
  selectedStudentId?: string | null; // Optional student ID to open chat with
}

const TeacherChatModal: React.FC<TeacherChatModalProps> = ({
  isOpen,
  onClose,
  teacherId,
  students = [],
  selectedStudentId = null
}) => {
  const { client, connectUser, isConnected, createChannel } = useStreamChat();
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState<string>('');
  const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);

  // Nickname management functions
  const getNicknames = useCallback((): Record<string, string> => {
    const stored = localStorage.getItem('studentNicknames');
    return stored ? JSON.parse(stored) : {};
  }, []);

  const setNickname = useCallback((studentId: string, nickname: string) => {
    const nicknames = getNicknames();
    if (nickname.trim()) {
      nicknames[studentId] = nickname.trim();
    } else {
      delete nicknames[studentId];
    }
    localStorage.setItem('studentNicknames', JSON.stringify(nicknames));
  }, [getNicknames]);

  const getNickname = useCallback((studentId: string): string | null => {
    const nicknames = getNicknames();
    return nicknames[studentId] || null;
  }, [getNicknames]);

  const getDisplayName = useCallback((studentId: string): string => {
    const nickname = getNickname(studentId);
    return nickname ? `${nickname} (${studentId})` : studentId;
  }, [getNickname]);

  // Extract student ID from channel ID (format: teacher-{teacherId}-student-{studentId})
  const getStudentIdFromChannel = (channelId: string): string => {
    const match = channelId.match(/student-(\d+)/);
    return match ? match[1] : 'Unknown';
  };

  // Get other member ID (not the teacher) - defined before use in useEffect
  const getStudentIdFromChannelMembers = (channel: any): string => {
    const members = channel.state?.members || {};
    const memberIds = Object.keys(members);
    const studentId = memberIds.find(id => id !== teacherId);
    return studentId || getStudentIdFromChannel(channel.id);
  };

  // Initialize chat and handle selected student
  useEffect(() => {
    const initializeAndHandleStudent = async () => {
      if (!isOpen || !teacherId) return;

      try {
        setIsLoading(true);

        // Connect teacher user if not already connected
        if (!isConnected) {
          await connectUser(teacherId, 'Teacher');
        }

        // If a specific student is selected, create/get their channel first
        if (selectedStudentId) {
          console.log('Creating/getting channel for student:', selectedStudentId);
          try {
            // Create or get the channel for this specific student
            const studentChannel = await createChannel(teacherId, selectedStudentId);
            console.log('Channel created/retrieved:', studentChannel.id);

            // Ensure the channel is properly watched and both members are added
            const currentMembers = studentChannel.state?.members || {};
            const memberIds = Object.keys(currentMembers);

            if (memberIds.length < 2 || !memberIds.includes(teacherId) || !memberIds.includes(selectedStudentId)) {
              // Force add members if they're missing
              try {
                if (!memberIds.includes(teacherId)) {
                  await studentChannel.addMembers([teacherId]);
                }
                if (!memberIds.includes(selectedStudentId)) {
                  await studentChannel.addMembers([selectedStudentId]);
                }
                // Watch again after adding members
                await studentChannel.watch();
              } catch (addError) {
                console.log('Members may already be in channel:', addError);
              }
            }

            // Watch the channel again to ensure it's fully initialized and ready for messaging
            await studentChannel.watch();

            // Verify channel is ready
            console.log('Channel state after initialization:', {
              id: studentChannel.id,
              members: Object.keys(studentChannel.state?.members || {}),
              ready: studentChannel.state?.initialized
            });

            setActiveChannel(studentChannel);

            // Now query all channels to update the list
            const channelFilters = {
              type: 'messaging',
              members: { $in: [teacherId] }
            };
            const channelSort = [{ last_message_at: -1 }];
            const channelQueryResponse = await client.queryChannels(channelFilters, channelSort, {
              watch: true,
              state: true,
            });
            setChannels(channelQueryResponse);

            // Ensure the student channel is still active
            const foundChannel = channelQueryResponse.find(ch => ch.id === studentChannel.id);
            if (foundChannel) {
              setActiveChannel(foundChannel);
            } else {
              // If not found in query, use the created channel
              setActiveChannel(studentChannel);
              // Add it to the channels list
              setChannels(prev => [studentChannel, ...prev]);
            }
          } catch (error) {
            console.error('Failed to create/get channel for student:', error);
            // Fallback: query all channels
            const channelFilters = {
              type: 'messaging',
              members: { $in: [teacherId] }
            };
            const channelSort = [{ last_message_at: -1 }];
            const channelQueryResponse = await client.queryChannels(channelFilters, channelSort, {
              watch: true,
              state: true,
            });
            setChannels(channelQueryResponse);

            // Try to find existing channel with this student
            const existingChannel = channelQueryResponse.find(channel => {
              const studentId = getStudentIdFromChannelMembers(channel);
              return studentId === selectedStudentId;
            });

            if (existingChannel) {
              setActiveChannel(existingChannel);
            } else if (channelQueryResponse.length > 0) {
              setActiveChannel(channelQueryResponse[0]);
            }
          }
        } else {
          // No specific student selected - just query all channels
          const channelFilters = {
            type: 'messaging',
            members: { $in: [teacherId] }
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
        }
      } catch (error) {
        console.error('Failed to initialize teacher chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndHandleStudent();
  }, [isOpen, teacherId, selectedStudentId, client, isConnected, connectUser, createChannel]);


  const selectChannel = (channel: any) => {
    setActiveChannel(channel);
  };

  // Get student name from student ID
  const getStudentName = (studentId: string): string => {
    const student = students.find(s => s.code === studentId);
    return student ? student.name : `Student ${studentId}`;
  };

  // Handle nickname edit
  const handleEditNickname = (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation();
    const currentNickname = getNickname(studentId);
    setNicknameInput(currentNickname || '');
    setEditingStudentId(studentId);
  };

  const handleSaveNickname = () => {
    if (editingStudentId) {
      setNickname(editingStudentId, nicknameInput);
      setEditingStudentId(null);
      setNicknameInput('');
    }
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setNicknameInput('');
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
                      <p className="text-text-muted text-xs mt-1">Start a conversation from a student's analysis page</p>
                    </div>
                  </div>
                ) : (
                  channels.map((channel) => {
                    const studentId = getStudentIdFromChannelMembers(channel);
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
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {getDisplayName(studentId)}
                              </p>
                              {lastMessage && (
                                <p className="text-xs text-text-muted truncate mt-1">
                                  {lastMessage}
                                </p>
                              )}
                            </div>
                            {activeChannel?.id === channel.id && (
                              <button
                                onClick={(e) => handleEditNickname(e, studentId)}
                                className="w-10 h-10 bg-purple-primary/20 hover:bg-purple-primary/40 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                                title="Edit nickname"
                              >
                                <Pencil className="w-5 h-5 text-purple-primary" />
                              </button>
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
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {activeChannel ? getDisplayName(getStudentIdFromChannelMembers(activeChannel)) : 'Select a conversation'}
                  </h3>
                  <p className="text-sm text-text-muted">
                    {activeChannel ? getStudentName(getStudentIdFromChannelMembers(activeChannel)) : 'Choose a chat from the sidebar'}
                  </p>
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
                      <p className="text-text-muted">Select a conversation to start chatting with your students.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Nickname Edit Modal */}
      {editingStudentId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={handleCancelEdit}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background-primary rounded-xl p-6 w-full max-w-md border border-white/10 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Edit Nickname</h3>
            <p className="text-sm text-text-muted mb-4">Student Code: {editingStudentId}</p>

            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveNickname();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              placeholder="Enter nickname (leave empty to remove)"
              className="w-full px-4 py-3 bg-surface border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-purple-primary mb-4"
              autoFocus
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNickname}
                className="px-4 py-2 bg-purple-primary hover:bg-purple-primary/90 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TeacherChatModal;

