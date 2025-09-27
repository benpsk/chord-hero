import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  List,
  SegmentedButtons,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const HERO_COLOR = '#7A4AA8';
const ACCENT_PURPLE = '#5C2BD9';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);

const PLAN_FEATURES = [
  'Unlimited streaming without ads',
  'Download tracks for offline sessions',
  'Lossless audio quality on supported devices',
  'Tailored setlists based on your skill level',
];

const ADDON_FEATURES = [
  'Up to 4 family profiles with shared billing',
  'Real-time lyrics with chord hints',
  'Early access to new weekly charts',
];

export default function SubscriptionScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const priceLabel = billingCycle === 'monthly' ? '$9.99/mo' : '$99.99/yr';
  const savingsLabel = billingCycle === 'yearly' ? 'Save 17% when billed annually' : 'Cancel anytime';
  const familyPriceLabel = billingCycle === 'monthly' ? '+ $4.99/mo add-on' : '+ $49.99/yr add-on';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: palette.background,
        },
        scrollContainer: {
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
          gap: 24,
        },
        heroSurface: {
          width: '100%',
          maxWidth: CARD_MAX_WIDTH,
          borderRadius: 28,
          padding: 24,
          backgroundColor: HERO_COLOR,
        },
        heroTitle: {
          color: '#FFFFFF',
          fontSize: 28,
          fontWeight: '700',
        },
        heroSubtitle: {
          color: 'rgba(255,255,255,0.85)',
          fontSize: 15,
          marginTop: 8,
        },
        heroFooter: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 24,
        },
        heroPrice: {
          color: '#FFFFFF',
          fontSize: 34,
          fontWeight: '800',
        },
        heroSavings: {
          color: 'rgba(255,255,255,0.7)',
          fontSize: 14,
        },
        segmentedWrapper: {
          width: '100%',
          maxWidth: CARD_MAX_WIDTH,
        },
        planCard: {
          width: '100%',
          maxWidth: CARD_MAX_WIDTH,
          borderRadius: 24,
          paddingVertical: 24,
          paddingHorizontal: 24,
          gap: 20,
          backgroundColor: theme.colors.surface,
        },
        planHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        planTitle: {
          color: palette.text,
          fontSize: 20,
          fontWeight: '700',
        },
        planPrice: {
          color: ACCENT_PURPLE,
          fontSize: 18,
          fontWeight: '700',
        },
        listGroup: {
          gap: 4,
        },
        addonCard: {
          width: '100%',
          maxWidth: CARD_MAX_WIDTH,
          borderRadius: 24,
          padding: 24,
          backgroundColor: palette.background === '#fff' ? '#F5F3FF' : '#1F1234',
          borderWidth: colorScheme === 'dark' ? 1 : 0,
          borderColor: 'rgba(255,255,255,0.08)',
          gap: 16,
        },
        addonHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        addonTitle: {
          color: colorScheme === 'dark' ? '#E0D6FF' : '#3B1B94',
          fontSize: 18,
          fontWeight: '700',
        },
        finePrint: {
          color: palette.icon,
          fontSize: 13,
          textAlign: 'center',
        },
      }),
    [colorScheme, palette.background, palette.icon, palette.text, theme.colors.surface]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}> 
      <Animated.ScrollView
        entering={FadeInUp.duration(400)}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        <Surface style={styles.heroSurface} elevation={3}>
          <Text style={styles.heroTitle}>Subscription Plans</Text>
          <Text style={styles.heroSubtitle}>
            Unlock full access to every rehearsal tool, chord chart, and curated setlist designed for your team.
          </Text>
          <SegmentedButtons
            style={[styles.segmentedWrapper, { marginTop: 24 }]}
            value={billingCycle}
            onValueChange={(value) => {
              if (value === 'monthly' || value === 'yearly') {
                setBillingCycle(value);
              }
            }}
            buttons={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
          />
          <Animated.View style={styles.heroFooter} entering={FadeInUp.delay(100).duration(300)}>
            <Text style={styles.heroPrice}>{priceLabel}</Text>
            <Text style={styles.heroSavings}>{savingsLabel}</Text>
          </Animated.View>
          <Button
            mode="contained"
            style={{ marginTop: 24, borderRadius: 12 }}
            buttonColor="#FFFFFF"
            textColor={HERO_COLOR}
            onPress={() => {}}>
            Start 14-day trial
          </Button>
        </Surface>

        <Surface style={styles.planCard} elevation={2}>
          <Animated.View entering={FadeInUp.delay(150).duration(300)} style={styles.planHeader}>
            <Text style={styles.planTitle}>Pro Studio</Text>
            <Text style={styles.planPrice}>{priceLabel}</Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(200).duration(300)} style={styles.listGroup}>
            {PLAN_FEATURES.map((feature) => (
              <List.Item
                key={feature}
                title={feature}
                titleStyle={{ color: palette.text, fontSize: 15 }}
                left={(props) => (
                  <List.Icon {...props} color={ACCENT_PURPLE} icon="check-circle" />
                )}
                style={{ paddingHorizontal: 0 }}
              />
            ))}
          </Animated.View>
          <Button mode="contained" onPress={() => {}} style={{ borderRadius: 12 }}>
            Upgrade to Pro Studio
          </Button>
        </Surface>

        <Surface style={styles.addonCard} elevation={0}>
          <Animated.View entering={FadeInUp.delay(250).duration(300)} style={styles.addonHeader}>
            <Avatar.Icon
              size={48}
              icon="account-multiple"
              color="#FFFFFF"
              style={{ backgroundColor: ACCENT_PURPLE }}
            />
            <View>
              <Text style={styles.addonTitle}>Family Add-on</Text>
              <Text style={{ color: colorScheme === 'dark' ? '#CDBEFF' : '#5C2BD9', fontSize: 14 }}>
                {familyPriceLabel}
              </Text>
            </View>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(300).duration(300)} style={styles.listGroup}>
            {ADDON_FEATURES.map((feature) => (
              <List.Item
                key={feature}
                title={feature}
                titleStyle={{
                  color: colorScheme === 'dark' ? '#E6DEFF' : '#311266',
                  fontSize: 15,
                }}
                left={(props) => (
                  <List.Icon
                    {...props}
                    color={colorScheme === 'dark' ? '#CDBEFF' : ACCENT_PURPLE}
                    icon="star-check"
                  />
                )}
                style={{ paddingHorizontal: 0 }}
              />
            ))}
          </Animated.View>
          <Button
            mode="outlined"
            textColor={colorScheme === 'dark' ? '#E0D6FF' : ACCENT_PURPLE}
            style={{ borderRadius: 12, borderColor: colorScheme === 'dark' ? '#CDBEFF' : ACCENT_PURPLE }}
            onPress={() => {}}>
            Add family sharing
          </Button>
        </Surface>

        <Text style={styles.finePrint}>
          Prices listed in USD. Taxes may apply. You can switch or cancel your plan anytime from your account settings.
        </Text>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
