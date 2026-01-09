import React, { createContext, useContext, useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import { Chat, Channel, ChannelList, MessageList, MessageInput, Thread, Window } from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import { BACKEND_URL } from '../config';

// Initialize Stream Chat client
// API Key: kt3cr78evu5y
// API Secret: kpfebwva7mvhp3wwwv8cynfgeemdrf7wkrexszr8zhz4p8nj2gnjr5jy4tadsamb
// Note: API Secret should be stored server-side for production token generation
const chatClient = StreamChat.getInstance('kt3cr78evu5y');

interface StreamChatContextType {
  client: StreamChat;
  isConnected: boolean;
  connectUser: (userId: string, userName?: string) => Promise<void>;
  disconnectUser: () => void;
  createChannel: (teacherId: string, studentId: string, createdBy?: string) => Promise<any>;
  getChannel: (channelId: string) => any;
}

const StreamChatContext = createContext<StreamChatContextType | undefined>(undefined);

export const useStreamChat = () => {
  const context = useContext(StreamChatContext);
  if (context === undefined) {
    throw new Error('useStreamChat must be used within a StreamChatProvider');
  }
  return context;
};

interface StreamChatProviderProps {
  children: React.ReactNode;
}

export const StreamChatProvider: React.FC<StreamChatProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Set up connection state listener
    const handleConnectionChange = (event: any) => {
      setIsConnected(event.online);
    };

    chatClient.on('connection.changed', handleConnectionChange);

    return () => {
      chatClient.off('connection.changed', handleConnectionChange);
    };
  }, []);

  const connectUser = async (userId: string, userName?: string) => {
    try {
      // Get JWT token from backend server
      const response = await fetch(`${BACKEND_URL}/stream-chat-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userName: userName || `User ${userId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate token');
      }

      const { token } = await response.json();

      await chatClient.connectUser(
        {
          id: userId,
          name: userName || `User ${userId}`,
        },
        token
      );

      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect user:', error);
      throw error;
    }
  };

  const disconnectUser = () => {
    chatClient.disconnectUser();
    setIsConnected(false);
  };

  const createChannel = async (teacherId: string, studentId: string, createdBy?: string) => {
    try {
      const channelId = `teacher-${teacherId}-student-${studentId}`;

      // First, ensure the student user exists in Stream Chat
      // This is critical for the channel to work properly
      try {
        const studentResponse = await fetch(`${BACKEND_URL}/stream-chat-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: studentId,
            userName: `Student ${studentId}`,
          }),
        });

        if (!studentResponse.ok) {
          console.warn('Failed to create student user in Stream Chat, continuing anyway:', await studentResponse.text());
        } else {
          console.log('Student user ensured in Stream Chat:', studentId);
        }
      } catch (userError) {
        console.warn('Error ensuring student user exists:', userError);
        // Continue anyway - the channel creation might still work
      }

      // Get channel reference with initial data
      // Ensure both members are explicitly added
      // Note: created_by_id cannot be set on client-side, only server-side auth can set it
      const channel = chatClient.channel('messaging', channelId, {
        members: [teacherId, studentId],
      } as any);

      // Try to create the channel
      try {
        await channel.create();
        console.log('Channel created successfully:', channelId);
      } catch (createError: any) {
        // If channel already exists (error code 4), that's fine - we'll just watch it
        if (createError.code !== 4 && !createError.message?.includes('already exists')) {
          console.error('Channel creation error:', createError);
          throw createError;
        } else {
          console.log('Channel already exists, watching:', channelId);
        }
      }

      // Watch the channel to load its state and ensure we're subscribed
      // This also ensures the channel is properly initialized for both members
      await channel.watch();

      // Ensure both members are in the channel
      const currentMembers = channel.state?.members || {};
      const memberIds = Object.keys(currentMembers);

      if (!memberIds.includes(teacherId)) {
        try {
          await channel.addMembers([teacherId]);
          console.log('Added teacher to channel:', teacherId);
        } catch (err) {
          console.warn('Error adding teacher to channel:', err);
        }
      }
      if (!memberIds.includes(studentId)) {
        try {
          await channel.addMembers([studentId]);
          console.log('Added student to channel:', studentId);
        } catch (err) {
          console.warn('Error adding student to channel:', err);
        }
      }

      // Force a refresh of the channel state to ensure it's ready for messaging
      await channel.watch();

      console.log('Channel ready for messaging:', channelId, 'Members:', Object.keys(channel.state?.members || {}));

      return channel;
    } catch (error) {
      console.error('Failed to create channel:', error);
      throw error;
    }
  };

  const getChannel = (channelId: string) => {
    return chatClient.channel('messaging', channelId);
  };

  const value = {
    client: chatClient,
    isConnected,
    connectUser,
    disconnectUser,
    createChannel,
    getChannel,
  };

  return (
    <StreamChatContext.Provider value={value}>
      <Chat client={chatClient} theme="messaging light">
        {children}
      </Chat>
    </StreamChatContext.Provider>
  );
};

export default StreamChatProvider;
