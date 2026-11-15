import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { CreateListingScreen } from '../screens/CreateListingScreen';
import { ProductDetailsScreen } from '../screens/ProductDetailsScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  CreateListing: undefined;
  ProductDetails: { listingId: string };
  Conversations: undefined;
  ChatDetail: { conversationId: string };
  Notifications: undefined;
  ForgotPassword: { identifier?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { colors, scheme } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary } };
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="CreateListing" component={CreateListingScreen} />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
        <Stack.Screen name="Conversations" component={ConversationsScreen} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
