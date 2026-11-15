import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { Icon, IconName } from '../components/ui';
import { HomeScreen } from '../screens/HomeScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { CreateListingScreen } from '../screens/CreateListingScreen';
import { ProductDetailsScreen } from '../screens/ProductDetailsScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { SavedAdsScreen } from '../screens/SavedAdsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';

export type TabParamList = {
  Home: undefined;
  Explore: { categoryId?: string; search?: string; verified?: boolean; openFilters?: boolean } | undefined;
  Sell: undefined;
  Chats: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Login: undefined;
  Register: undefined;
  CreateListing: undefined;
  EditListing: { listingId: string };
  ProductDetails: { listingId: string };
  ChatDetail: { conversationId: string };
  Notifications: undefined;
  ForgotPassword: { identifier?: string } | undefined;
  SavedAds: undefined;
  ChangePassword: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, [IconName, IconName]> = {
  Home: ['home-variant-outline', 'home-variant'],
  Explore: ['magnify', 'magnify'],
  Sell: ['plus', 'plus'],
  Chats: ['chat-outline', 'chat'],
  Account: ['account-outline', 'account'],
};
/** Tabs that need an account; signed-out users are sent to Login instead. */
const NEEDS_ACCOUNT = new Set(['Sell', 'Chats', 'Account']);

const SellPlaceholder = () => null;

/** Home · Explore · Sell (raised FAB) · Chats (unread badge) · Account. */
const TabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadChats } = useNotifications();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const name = route.name as keyof TabParamList;
        const focused = state.index === index;
        const onPress = () => {
          if (NEEDS_ACCOUNT.has(name) && !user) {
            navigation.navigate('Login');
            return;
          }
          if (name === 'Sell') {
            navigation.navigate('CreateListing');
            return;
          }
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        if (name === 'Sell') {
          return (
            <TouchableOpacity key={route.key} style={styles.item} onPress={onPress} accessibilityRole="button" accessibilityLabel="Sell an item">
              <View style={styles.fab}>
                <Icon name="plus" size={30} color={colors.onPrimary} />
              </View>
              <Text style={[styles.label, styles.sellLabel]}>Sell</Text>
            </TouchableOpacity>
          );
        }

        const tint = focused ? colors.primaryText : colors.textMuted;
        const badge = name === 'Chats' && unreadChats > 0 ? unreadChats : 0;
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.item}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={badge ? `${name}, ${badge} unread` : name}
          >
            <View>
              <Icon name={TAB_ICONS[name][focused ? 1 : 0]} size={24} color={tint} />
              {badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color: tint }, focused && styles.labelActive]}>{name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const Tabs: React.FC = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Explore" component={ExploreScreen} />
    <Tab.Screen name="Sell" component={SellPlaceholder} />
    <Tab.Screen name="Chats" component={ConversationsScreen} />
    <Tab.Screen name="Account" component={AccountScreen} />
  </Tab.Navigator>
);

export const AppNavigator: React.FC = () => {
  const { colors, scheme } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary } };
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        <Stack.Screen name="CreateListing" component={CreateListingScreen} />
        <Stack.Screen name="EditListing" component={CreateListingScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="SavedAds" component={SavedAdsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    bar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 6 },
    item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2, minHeight: 48 },
    label: { fontFamily: font.medium, fontSize: 11 },
    labelActive: { fontFamily: font.semibold },
    sellLabel: { color: c.text, fontFamily: font.semibold },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginTop: -28,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: c.surface,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    badge: { position: 'absolute', top: -4, right: -9, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.surface },
    badgeText: { color: '#fff', fontSize: 9, fontFamily: font.bold },
  });
