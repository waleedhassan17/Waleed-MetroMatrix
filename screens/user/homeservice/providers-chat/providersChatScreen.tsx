import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Service type configurations
const SERVICE_CONFIG: Record<string, { 
  title: string; 
  gradient: string[];
  lightGradient: string[];
  accentColor: string;
}> = {
  electricians: {
    title: 'Electrician',
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
  },
  plumbers: {
    title: 'Plumber',
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
  },
  'ac-repairers': {
    title: 'AC Repairer',
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
  },
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'provider';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

interface Provider {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  image: string;
  distance: string;
}

type ProviderChatScreenRouteParams = {
  provider?: Provider;
  serviceType?: 'electricians' | 'plumbers' | 'ac-repairers';
  jobDescription?: string;
  location?: string;
};

export default function ProviderChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ProviderChatScreenRouteParams }, 'params'>>();

  const { 
    provider, 
    serviceType = 'ac-repairers', 
    jobDescription = '', 
    location = '' 
  } = route.params || {};
  
  const serviceConfig = SERVICE_CONFIG[serviceType] || SERVICE_CONFIG['ac-repairers'];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello! I saw your request for ${serviceConfig.title.toLowerCase()} services. I'm available and ready to help.`,
      sender: 'provider',
      timestamp: new Date(Date.now() - 60000),
      status: 'read',
    },
    {
      id: '2',
      text: `Your job: "${jobDescription}"\n\nI can reach your location at ${location} within 30 minutes. Would you like to confirm the booking?`,
      sender: 'provider',
      timestamp: new Date(Date.now() - 30000),
      status: 'read',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const confirmModalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(confirmModalAnim, {
      toValue: showConfirmModal ? 1 : 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [showConfirmModal]);

  const handleBackPress = useCallback(() => {
    if (isConfirmed) {
      navigation.goBack();
    } else {
      Alert.alert(
        'Leave Chat',
        'Are you sure you want to leave? Your conversation will be saved.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', onPress: () => navigation.goBack() },
        ]
      );
    }
  }, [navigation, isConfirmed]);

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Simulate provider response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thank you for your message. I'll be there as soon as possible!",
        sender: 'provider',
        timestamp: new Date(),
        status: 'delivered',
      };
      setMessages(prev => [...prev, response]);
    }, 2000);
  }, [inputText]);

  const handleCall = useCallback(() => {
    Alert.alert(
      'Call Provider',
      `Do you want to call ${provider?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => console.log('Calling...') },
      ]
    );
  }, [provider]);

  const handleConfirmRequest = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  const handleFinalConfirm = useCallback(() => {
    setIsConfirmed(true);
    setShowConfirmModal(false);

    const confirmMessage: Message = {
      id: Date.now().toString(),
      text: '✅ Booking Confirmed! The provider is on their way.',
      sender: 'provider',
      timestamp: new Date(),
      status: 'delivered',
    };
    setMessages(prev => [...prev, confirmMessage]);
  }, []);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.providerMessageContainer,
        ]}
      >
        {!isUser && (
          <Image source={{ uri: provider?.image }} style={styles.messageAvatar} />
        )}
        <View
          style={[
            styles.messageBubble,
            isUser 
              ? [styles.userBubble, { backgroundColor: serviceConfig.accentColor }]
              : styles.providerBubble,
          ]}
        >
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
              {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isUser && item.status && (
              <Ionicons
                name={item.status === 'read' ? 'checkmark-done' : 'checkmark'}
                size={14}
                color="rgba(255,255,255,0.7)"
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  if (!provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Provider information not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.errorLink, { color: serviceConfig.accentColor }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={isAndroid ? '#FFFFFF' : 'transparent'}
        translucent={!isAndroid}
      />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FAFAFA']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color="#1E293B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.providerHeaderInfo} activeOpacity={0.8}>
              <View style={styles.providerAvatarContainer}>
                <Image source={{ uri: provider.image }} style={styles.headerAvatar} />
                <View style={styles.onlineBadge} />
              </View>
              <View style={styles.providerHeaderText}>
                <Text style={styles.providerHeaderName}>{provider.name}</Text>
                <View style={styles.providerHeaderMeta}>
                  <Text style={styles.providerHeaderSpecialty}>{provider.specialty}</Text>
                  <View style={styles.headerRating}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.headerRatingText}>{provider.rating}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handleCall}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ECFDF5', '#D1FAE5']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="call" size={18} color="#10B981" />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#F1F5F9', '#E2E8F0']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#64748B" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Booking Status Banner */}
      {isConfirmed && (
        <LinearGradient
          colors={['#ECFDF5', '#D1FAE5']}
          style={styles.statusBanner}
        >
          <View style={styles.statusBannerIcon}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
          <View style={styles.statusBannerText}>
            <Text style={styles.statusBannerTitle}>Booking Confirmed!</Text>
            <Text style={styles.statusBannerSubtitle}>Provider is on their way</Text>
          </View>
        </LinearGradient>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={scrollViewRef as any}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Confirm Request Banner */}
        {!isConfirmed && (
          <Animated.View
            style={[
              styles.confirmBanner,
              { opacity: fadeAnim },
            ]}
          >
            <LinearGradient
              colors={serviceConfig.lightGradient as [string, string]}
              style={styles.confirmBannerGradient}
            >
              <View style={styles.confirmBannerContent}>
                <View style={[styles.confirmIcon, { backgroundColor: `${serviceConfig.accentColor}20` }]}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={serviceConfig.accentColor} />
                </View>
                <View style={styles.confirmTextContainer}>
                  <Text style={styles.confirmTitle}>Ready to book?</Text>
                  <Text style={styles.confirmSubtitle}>Confirm your request with {provider.name}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmRequest}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={serviceConfig.gradient as [string, string]}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={24} color="#64748B" />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                inputText.trim() && { backgroundColor: serviceConfig.accentColor },
              ]}
              onPress={handleSendMessage}
              activeOpacity={0.8}
              disabled={!inputText.trim()}
            >
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() ? '#FFFFFF' : '#94A3B8'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: confirmModalAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowConfirmModal(false)}
          />
          <Animated.View
            style={[
              styles.confirmModal,
              {
                transform: [{
                  translateY: confirmModalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <LinearGradient
                colors={serviceConfig.gradient as [string, string]}
                style={styles.modalIconBg}
              >
                <Ionicons name="checkmark-done" size={32} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.modalTitle}>Confirm Booking</Text>
              <Text style={styles.modalSubtitle}>
                You're about to book {provider.name} for your service request
              </Text>
            </View>

            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <View style={styles.modalDetailIcon}>
                  <Ionicons name="person-outline" size={18} color="#64748B" />
                </View>
                <View>
                  <Text style={styles.modalDetailLabel}>Provider</Text>
                  <Text style={styles.modalDetailValue}>{provider.name}</Text>
                </View>
              </View>

              <View style={styles.modalDetailRow}>
                <View style={styles.modalDetailIcon}>
                  <Ionicons name="location-outline" size={18} color="#64748B" />
                </View>
                <View style={styles.modalDetailTextContainer}>
                  <Text style={styles.modalDetailLabel}>Location</Text>
                  <Text style={styles.modalDetailValue} numberOfLines={2}>{location}</Text>
                </View>
              </View>

              <View style={styles.modalDetailRow}>
                <View style={styles.modalDetailIcon}>
                  <Ionicons name="document-text-outline" size={18} color="#64748B" />
                </View>
                <View style={styles.modalDetailTextContainer}>
                  <Text style={styles.modalDetailLabel}>Job Description</Text>
                  <Text style={styles.modalDetailValue} numberOfLines={2}>{jobDescription}</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleFinalConfirm}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={serviceConfig.gradient as [string, string]}
                  style={styles.modalConfirmGradient}
                >
                  <Text style={styles.modalConfirmText}>Confirm Booking</Text>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 12,
  },
  errorLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerGradient: {
    paddingTop: isAndroid ? StatusBar.currentHeight : 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  providerHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  providerHeaderText: {
    flex: 1,
  },
  providerHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  providerHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  providerHeaderSpecialty: {
    fontSize: 12,
    color: '#64748B',
  },
  headerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statusBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerText: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  statusBannerSubtitle: {
    fontSize: 12,
    color: '#047857',
    marginTop: 1,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  providerMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  providerBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 21,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  statusIcon: {
    marginLeft: 2,
  },
  confirmBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  confirmBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTextContainer: {
    flex: 1,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  confirmSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  confirmButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 4,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  confirmModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDetailTextContainer: {
    flex: 1,
  },
  modalDetailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  modalDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmButton: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});