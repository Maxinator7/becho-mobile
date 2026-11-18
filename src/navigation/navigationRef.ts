import { ParamListBase, createNavigationContainerRef } from '@react-navigation/native';

/** Lets code outside screens (e.g. the feedback sheet) read the current route. */
export const navigationRef = createNavigationContainerRef<ParamListBase>();

/** Name of the screen the user is looking at, e.g. "Home" or "ProductDetails". */
export function currentRouteName(): string | undefined {
  return navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
}
