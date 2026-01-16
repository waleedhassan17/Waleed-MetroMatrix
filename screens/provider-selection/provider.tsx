import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../store/store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { 
  setProviderType, 
  selectProviderType, 
  selectIsProviderTypeSelected, 
  selectProviderError,
  selectProviderSubType, // Changed from selectProviderSubTypes
  setProviderSubType, // Changed from toggleProviderSubType
  loadProviderSelectionFromStorage
} from './providerSlice';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Define navigation type
// In ProviderSelectionScreen.tsx
type RootStackParamList = {
  RoleSelection: undefined;
  ProviderSelection: undefined;
  ProviderSignIn: undefined; 
};

// Provider types
export type ProviderMainType = 'doctor' | 'home_service' | 'vendor';
export type HomeServiceSubType = 'electrician' | 'plumber' | 'ac_repairer';

// Provider card configuration
interface ProviderCardConfig {
  id: ProviderMainType;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  hasSubTypes: boolean;
  checkmarkColor?: string;
}

interface SubTypeConfig {
  id: HomeServiceSubType;
  title: string;
  icon: string;
}

export default function ProviderSelectionScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux selectors
  const selectedProvider = useSelector(selectProviderType);
  const isProviderSelected = useSelector(selectIsProviderTypeSelected);
  const providerError = useSelector(selectProviderError);
  const selectedSubType = useSelector(selectProviderSubType); // Changed from array to single value
  
  // Local state for expanded cards
  const [expandedCard, setExpandedCard] = useState<ProviderMainType | null>(null);
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const cardAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Load saved provider selection on mount
  useEffect(() => {
    dispatch(loadProviderSelectionFromStorage());
  }, [dispatch]);

  // Set expanded card if home_service is selected on load
  useEffect(() => {
    if (selectedProvider === 'home_service') {
      setExpandedCard('home_service');
    }
  }, [selectedProvider]);

  useEffect(() => {
    // Main entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();

    // Staggered card animations
    cardAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, 200 + (index * 150));
    });

    // Button animation
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 800);
  }, []);

  // Show error alert if there's an error
  useEffect(() => {
    if (providerError) {
      Alert.alert(
        'Error',
        providerError,
        [{ text: 'OK' }]
      );
    }
  }, [providerError]);

  const handleProviderSelect = (providerId: ProviderMainType) => {
    try {
      console.log(`🎯 Provider type selected: ${providerId}`);
      
      if (providerId === 'home_service') {
        // For home service, toggle expansion and set provider type
        if (expandedCard === providerId) {
          // If already expanded and has selection, just collapse
          setExpandedCard(null);
        } else {
          // Expand and set provider type
          setExpandedCard(providerId);
          dispatch(setProviderType(providerId));
        }
      } else {
        // For other providers (doctor, vendor), select immediately and collapse any expansion
        dispatch(setProviderType(providerId));
        setExpandedCard(null);
      }
      
    } catch (error) {
      console.error('Error selecting provider:', error);
      Alert.alert(
        'Error',
        'Failed to select provider type. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Changed to handle single selection and auto-collapse
  const handleSubTypeSelect = (subType: HomeServiceSubType) => {
    dispatch(setProviderSubType(subType));
    
    // Auto-collapse after selection
    setTimeout(() => {
      setExpandedCard(null);
    }, 300); // Small delay for visual feedback
  };
// Update handleContinue to navigate without params
const handleContinue = () => {
  if (!selectedProvider) {
    Alert.alert(
      'Selection Required',
      'Please select a service type to continue.',
      [{ text: 'OK' }]
    );
    return;
  }

  if (selectedProvider === 'home_service' && !selectedSubType) {
    Alert.alert(
      'Selection Required',
      'Please select a home service type.',
      [{ text: 'OK' }]
    );
    return;
  }

  // ✅ Navigate without params - data is already in Redux/AsyncStorage
  navigation.navigate('ProviderSignIn');
};

  const handleBack = () => {
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('RoleSelection');
    }
  };

  const renderHeader = () => (
    <Animated.View style={[
      styles.header,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={isAndroid ? '#F8FAFC' : 'transparent'} 
        translucent={!isAndroid} 
      />
      
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.headerContent}>
        <Text style={styles.appTitle}>MetroMatrix</Text>
        <Text style={styles.headerSubtitle}>Choose Your Service</Text>
        <Text style={styles.headerDescription}>Select the service you want to provide</Text>
      </View>
    </Animated.View>
  );

  const renderSubTypes = (subTypes: SubTypeConfig[]) => (
    <View style={styles.subTypesContainer}>
      {subTypes.map((subType, index) => {
        const isSelected = selectedSubType === subType.id; // Changed comparison
        return (
          <TouchableOpacity
            key={subType.id}
            style={[
              styles.subTypeItem,
              isSelected && styles.subTypeItemSelected
            ]}
            onPress={() => handleSubTypeSelect(subType.id)} // Changed handler
            activeOpacity={0.7}
          >
            <View style={styles.subTypeContent}>
              <View style={[
                styles.subTypeIconContainer,
                isSelected && styles.subTypeIconContainerSelected
              ]}>
                <MaterialCommunityIcons 
                  name={subType.icon as any} 
                  size={20} 
                  color={isSelected ? '#10b981' : '#64748b'} 
                />
              </View>
              <Text style={[
                styles.subTypeText,
                isSelected && styles.subTypeTextSelected
              ]}>
                {subType.title}
              </Text>
            </View>
            {isSelected && (
              <View style={styles.checkmarkContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderProviderCard = (config: ProviderCardConfig, animValue: Animated.Value, index: number) => {
    const isSelected = selectedProvider === config.id;
    const isExpanded = expandedCard === config.id;
    const showCheckmark = isSelected && (!config.hasSubTypes || selectedSubType !== null); // Changed condition

    return (
      <Animated.View 
        key={config.id}
        style={[
          styles.providerCard,
          isSelected && styles.providerCardSelected,
          {
            opacity: animValue,
            transform: [
              { 
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              },
              { 
                scale: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1]
                })
              }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => handleProviderSelect(config.id)}
          activeOpacity={0.95}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
              <MaterialCommunityIcons 
                name={config.icon as any} 
                size={32} 
                color={config.iconColor} 
              />
            </View>
            
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>{config.title}</Text>
              <Text style={styles.cardDescription}>{config.description}</Text>
            </View>
            
            <View style={styles.cardActions}>
              {showCheckmark && (
                <View style={styles.selectedBadge}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color={config.checkmarkColor || '#10b981'} 
                  />
                </View>
              )}
              {config.hasSubTypes && (
                <View style={styles.expandIconContainer}>
                  <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#64748b" 
                  />
                </View>
              )}
              {!config.hasSubTypes && (
                <View style={styles.arrowContainer}>
                  <Ionicons 
                    name="chevron-forward" 
                    size={24} 
                    color="#64748b" 
                  />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {config.hasSubTypes && isExpanded && renderSubTypes(homeServiceSubTypes)}
      </Animated.View>
    );
  };

  const providerConfigs: ProviderCardConfig[] = [
    {
      id: 'doctor',
      title: "Doctor",
      description: "Provide healthcare consultations and medical services",
      icon: "stethoscope",
      iconColor: "#ec4899",
      iconBg: "#fef2f8",
      hasSubTypes: false,
      checkmarkColor: "#ec4899"
    },
    {
      id: 'home_service',
      title: "Home Service Provider",
      description: "Offer repair and maintenance services",
      icon: "tools",
      iconColor: "#10b981",
      iconBg: "#f0fdf4",
      hasSubTypes: true,
      checkmarkColor: "#10b981"
    },
    {
      id: 'vendor',
      title: "Vendor Registration",
      description: "Sell products and manage your online store",
      icon: "store",
      iconColor: "#8b5cf6",
      iconBg: "#f5f3ff",
      hasSubTypes: false,
      checkmarkColor: "#8b5cf6"
    }
  ];

  // Only 3 sub-types now: Electrician, Plumber, AC Repairer
  const homeServiceSubTypes: SubTypeConfig[] = [
    { id: 'electrician', title: 'Electrician', icon: 'lightning-bolt' },
    { id: 'plumber', title: 'Plumber', icon: 'pipe-wrench' },
    { id: 'ac_repairer', title: 'AC Repairer', icon: 'air-conditioner' },
  ];

  // Ensure `canContinue` is a boolean. For home_service require a sub-type selection.
  const canContinue: boolean = Boolean(selectedProvider) && (
    selectedProvider !== 'home_service' || selectedSubType !== null
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Background elements */}
      <View style={styles.backgroundElements} pointerEvents="none">
        <View style={[styles.backgroundCircle, styles.circle1]} />
        <View style={[styles.backgroundCircle, styles.circle2]} />
        <View style={[styles.backgroundShape, styles.shape1]} />
      </View>

      {renderHeader()}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          <View style={styles.cardsContainer}>
            {providerConfigs.map((config, index) => 
              renderProviderCard(config, cardAnims[index], index)
            )}
          </View>
        </Animated.View>
      </ScrollView>

   {/* Continue Button */}
      <Animated.View style={[
        styles.bottomContainer,
        {
          opacity: buttonAnim,
          transform: [
            { 
              translateY: buttonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0]
              })
            }
          ]
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canContinue && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue to Registration</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
  },
  
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  
  backgroundShape: {
    position: 'absolute',
    backgroundColor: 'rgba(139, 92, 246, 0.02)',
    width: 100,
    height: 100,
    borderRadius: 20,
    transform: [{ rotate: '45deg' }],
  },
  
  shape1: {
    top: '30%',
    right: '10%',
  },

  header: {
    backgroundColor: 'transparent',
    paddingTop: isAndroid ? 20 : 8,
    paddingBottom: 16,
    paddingHorizontal: 24,
    zIndex: 1000,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  
  headerContent: {
    alignItems: 'center',
  },
  
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },

  headerDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },

  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  
  contentContainer: {
    flex: 1,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    paddingTop: 8,
  },

  cardsContainer: {
    gap: 16,
  },
  
  providerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  providerCardSelected: {
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: '#f0fdf4',
  },
  
  cardTouchable: {
    width: '100%',
  },
  
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  
  cardTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  
  cardDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 18,
    letterSpacing: 0.1,
  },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  selectedBadge: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  arrowContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  expandIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  // Sub-types styling
  subTypesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 8,
  },

  subTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  subTypeItemSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },

  subTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  subTypeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  subTypeIconContainerSelected: {
    backgroundColor: '#dcfce7',
  },

  subTypeText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#334155',
    letterSpacing: 0.1,
  },

  subTypeTextSelected: {
    fontWeight: '600',
    color: '#1A1A1A',
  },

  checkmarkContainer: {
    marginLeft: 8,
  },

  // Bottom button
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    zIndex: 2000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },

  continueButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  continueButtonDisabled: {
    backgroundColor: '#cbd5e1',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
      },
    }),
  },

  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});