import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { CreateListingScreen } from '../screens/CreateListingScreen';
import { ProductDetailsScreen } from '../screens/ProductDetailsScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  CreateListing: undefined;
  ProductDetails: { listingId: string };
  Conversations: undefined;
  ChatDetail: { conversationId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="CreateListing" component={CreateListingScreen} />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
        <Stack.Screen name="Conversations" component={ConversationsScreen} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
