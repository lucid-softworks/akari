import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useBorderColor } from "@/hooks/useBorderColor";
import { useThemeColor } from "@/hooks/useThemeColor";

type Message = {
  id: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
};

export default function ConversationScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [messageText, setMessageText] = useState("");
  const borderColor = useBorderColor();

  // Theme colors
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");

  // Mock messages - replace with actual API calls
  const messages: Message[] = [
    {
      id: "1",
      text: "Hey, how are you doing?",
      timestamp: "2:30 PM",
      isFromMe: false,
    },
    {
      id: "2",
      text: "I'm doing great! How about you?",
      timestamp: "2:32 PM",
      isFromMe: true,
    },
    {
      id: "3",
      text: "Pretty good! Just working on some projects.",
      timestamp: "2:35 PM",
      isFromMe: false,
    },
  ];

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // TODO: Send message via API
      console.log("Sending message:", messageText);
      setMessageText("");
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ThemedView
      style={[
        styles.messageContainer,
        item.isFromMe ? styles.myMessage : styles.theirMessage,
      ]}
    >
      <ThemedView
        style={[
          styles.messageBubble,
          item.isFromMe ? styles.myBubble : styles.theirBubble,
          {
            backgroundColor: item.isFromMe ? "#007AFF" : backgroundColor,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.messageText,
            { color: item.isFromMe ? "white" : textColor },
          ]}
        >
          {item.text}
        </ThemedText>
        <ThemedText
          style={[
            styles.messageTimestamp,
            { color: item.isFromMe ? "rgba(255,255,255,0.6)" : iconColor },
          ]}
        >
          {item.timestamp}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <ThemedView style={styles.headerInfo}>
            <ThemedText style={styles.headerTitle}>
              {decodeURIComponent(handle)}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Messages */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Message Input */}
        <ThemedView
          style={[styles.inputContainer, { borderTopColor: borderColor }]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                color: textColor,
              },
            ]}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={iconColor}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !messageText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <IconSymbol
              name="arrow.up.circle.fill"
              size={32}
              color={messageText.trim() ? "#007AFF" : "#C7C7CC"}
            />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  myMessage: {
    alignItems: "flex-end",
  },
  theirMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myBubble: {
    // backgroundColor is set dynamically
  },
  theirBubble: {
    // backgroundColor is set dynamically
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageTimestamp: {
    fontSize: 12,
    opacity: 0.6,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    padding: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
