import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../../constants/Colors';
import { Fonts } from '../../../constants/Fonts';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    title: 'One App for Your City Life',
    description: 'MetroMatrix simplifies everything you need in one place.',
    icon: 'city-variant',
    color: '#6366F1',
  },
  {
    title: 'Trusted Home Services',
    description: 'Book trusted home service providers instantly with ease.',
    icon: 'home-heart',
    color: '#8B5CF6',
  },
  {
    title: 'Healthcare at Your Fingertips',
    description: 'Consult doctors and manage your health online anytime.',
    icon: 'heart-pulse',
    color: '#EC4899',
  },
  {
    title: 'Shop Your Favorites',
    description: 'Shop your favorite brands — all in one convenient place.',
    icon: 'shopping',
    color: '#F59E0B',
  }
];

interface OnboardingProps {
  onComplete?: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation<any>();

  // Animation values for staggered animations
  const backgroundScaleAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const iconRotateAnim = useRef(new Animated.Value(-180)).current;
  const titleOpacityAnim = useRef(new Animated.Value(0)).current;
  const titleTranslateAnim = useRef(new Animated.Value(40)).current;
  const descriptionOpacityAnim = useRef(new Animated.Value(0)).current;
  const descriptionTranslateAnim = useRef(new Animated.Value(40)).current;

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Trigger animations when slide changes
  useEffect(() => {
    // Reset all animations
    backgroundScaleAnim.setValue(0);
    iconScaleAnim.setValue(0);
    iconRotateAnim.setValue(-180);
    titleOpacityAnim.setValue(0);
    titleTranslateAnim.setValue(40);
    descriptionOpacityAnim.setValue(0);
    descriptionTranslateAnim.setValue(40);

    // Background circle animates first
    Animated.spring(backgroundScaleAnim, {
      toValue: 1,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Icon scale and rotate after background (staggered)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(iconRotateAnim, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);

    // Title animates after icon
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateAnim, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Description animates last
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(descriptionOpacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(descriptionTranslateAnim, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 550);
  }, [currentIndex]);

  const handleContinue = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      onComplete?.();
      navigation.navigate('RoleSelection');
    }
  };

  const renderItem = ({ item }: { item: typeof slides[0] }) => {
    const interpolatedRotate = iconRotateAnim.interpolate({
      inputRange: [-180, 0],
      outputRange: ['-180deg', '0deg'],
    });

    return (
      <View style={styles.slide}>
        {/* Top Section: Background Circle with Icon centered inside */}
        <View style={styles.iconSectionWrapper}>
          {/* Background Circle - Animated Scale (Behind Icon) */}
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: item.color + '15',
                transform: [{ scale: backgroundScaleAnim }],
              },
            ]}
          />

          {/* Icon Container - Centered in circle with Staggered Animations (Above Circle) */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: iconScaleAnim },
                  { rotate: interpolatedRotate },
                ],
              },
            ]}
          >
            <Icon name={item.icon} size={80} color={item.color} />
          </Animated.View>
        </View>

        {/* Bottom Section: Text below the circle */}
        <View style={styles.textSection}>
          {/* Title with Staggered Animation */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: titleOpacityAnim,
                transform: [{ translateY: titleTranslateAnim }],
              },
            ]}
          >
            <Text style={styles.title}>{item.title}</Text>
          </Animated.View>

          {/* Description with Staggered Animation */}
          <Animated.View
            style={{
              opacity: descriptionOpacityAnim,
              transform: [{ translateY: descriptionTranslateAnim }],
            }}
          >
            <Text style={styles.description}>{item.description}</Text>
          </Animated.View>
        </View>
      </View>
    );
  };

  const Pagination = () => (
    <View style={styles.pagination}>
      {slides.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: index === currentIndex ? '#00A389' : '#B8EDE6',
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => {
          onComplete?.();
          navigation.navigate('RoleSelection');
        }}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        keyExtractor={(_, index) => index.toString()}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      <View style={styles.footer}>
        <Pagination />

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconSectionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
    marginBottom: 48,
    position: 'relative',
    width: 240,
  },
  backgroundCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    alignSelf: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  textSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  footer: {
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    height: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  continueButton: {
    backgroundColor: '#00A389',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00A389',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  arrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});