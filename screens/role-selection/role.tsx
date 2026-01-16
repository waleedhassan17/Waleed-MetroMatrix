import React, { useRef, useEffect } from 'react';
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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { setUserRole, selectUserRole, selectIsRoleSelected, selectRoleError } from './roleSlice';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Define navigation type - ADD YOUR TARGET SCREENS HERE
// Define navigation type - MUST MATCH App.tsx routes
type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  RoleSelection: undefined;
  ProviderSelection: undefined;
  SignIn: undefined;
  SignUp: undefined;
  CompleteProfile: undefined;
};

// Define role card configuration type
interface RoleCardConfig {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  onPress: () => void;
}

export default function RoleSelectionScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const dispatch = useDispatch();
  
  // Redux selectors - simplified with basic error handling
  const currentRole = useSelector(selectUserRole);
  const isRoleSelected = useSelector(selectIsRoleSelected);
  const roleError = useSelector(selectRoleError);
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const cardAnim1 = useRef(new Animated.Value(0)).current;
  const cardAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
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
    setTimeout(() => {
      Animated.spring(cardAnim1, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 200);

    setTimeout(() => {
      Animated.spring(cardAnim2, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 400);
  }, []);

  // Show error alert if there's a role error
  useEffect(() => {
    if (roleError) {
      Alert.alert(
        'Error',
        roleError,
        [{ text: 'OK' }]
      );
    }
  }, [roleError]);

  const handleRoleSelection = (role: 'provider' | 'user') => {
  try {
    console.log(`✅ Role selected: ${role}`);
    
    // Dispatch role selection to Redux store
    dispatch(setUserRole(role));
    
    // Navigate to the correct next screen
    if (role === 'provider') {
      navigation.navigate('ProviderSelection');
    } else {
      navigation.navigate('SignIn');
    }
  } catch (error) {
    console.error('Error selecting role:', error);
    Alert.alert(
      'Error',
      'Failed to select role. Please try again.',
      [{ text: 'OK' }]
    );
  }
};
  const handleProviderSelect = () => {
    handleRoleSelection('provider');
  };

  const handleUserSelect = () => {
    handleRoleSelection('user');
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
      
      <View style={styles.headerContent}>
        <Text style={styles.appTitle}>MetroMatrix</Text>
        <Text style={styles.headerSubtitle}>Choose your role to get started</Text>
      </View>
    </Animated.View>
  );

  const renderRoleCard = (config: RoleCardConfig, animValue: Animated.Value) => (
    <Animated.View 
      style={[
        styles.roleCard,
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
        onPress={config.onPress}
        activeOpacity={0.95}
      >
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
            <Ionicons 
              name={config.icon} 
              size={32} 
              color={config.iconColor} 
            />
          </View>
          
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{config.title}</Text>
            <Text style={styles.cardDescription}>{config.description}</Text>
          </View>
          
          <View style={styles.arrowContainer}>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#64748b" 
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const roleConfigs: RoleCardConfig[] = [
    {
      title: "Service Provider",
      description: "Offer your professional services to customers in your area",
      icon: "construct",
      iconColor: "#6366f1",
      iconBg: "#f0f4ff",
      onPress: handleProviderSelect
    },
    {
      title: "User",
      description: "Find and book trusted service providers for your needs",
      icon: "person",
      iconColor: "#10b981",
      iconBg: "#f0fdf4",
      onPress: handleUserSelect
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern background elements */}
      <View style={styles.backgroundElements}>
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
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome!</Text>
            <Text style={styles.welcomeText}>
              Please select your role to continue with the appropriate registration process.
            </Text>
          </View>

          <View style={styles.cardsContainer}>
            {roleConfigs.map((config, index) => (
              <View key={index}>
                {renderRoleCard(
                  config, 
                  index === 0 ? cardAnim1 : cardAnim2
                )}
              </View>
            ))}
          </View>

          <Animated.View style={[
            styles.helpSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <View style={styles.helpCard}>
              <Ionicons name="help-circle-outline" size={20} color="#667eea" />
              <Text style={styles.helpText}>
                Need help choosing? Contact our support team anytime.
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Modern background elements for visual interest
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
    paddingTop: isAndroid ? 40 : 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
    zIndex: 1000,
  },
  
  headerContent: {
    alignItems: 'center',
    paddingTop: 24,
  },
  
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },

  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 48,
    paddingHorizontal: 16,
  },
  
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  
  welcomeText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: width * 0.85,
  },

  cardsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  
  roleCard: {
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
  
  cardTouchable: {
    width: '100%',
  },
  
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  
  cardTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  
  cardDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 20,
    letterSpacing: 0.1,
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
  
  helpSection: {
    marginTop: 24,
  },
  
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  
  helpText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
    letterSpacing: 0.2,
  },
});