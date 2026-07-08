import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

import { Pressable } from 'react-native';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href?: string | null };

export function ExternalLink({ href, ...rest }: Props) {
  if (!href || typeof href !== 'string' || href.trim() === '' || href.toLowerCase() === 'undefined') {
    // If there is no valid href, render as a regular Pressable to prevent expo-router crash
    // @ts-ignore
    const { onPress, ...pressableProps } = rest;
    return (
      <Pressable
        {...pressableProps}
        onPress={(event) => {
          console.warn('ExternalLink: Attempted to open an invalid URL:', href);
          if (onPress) {
            onPress(event as any);
          }
        }}
      />
    );
  }

  return (
    <Link
      target="_blank"
      {...rest}
      href={href as any}
      onPress={async (event) => {
        if (rest.onPress) {
          rest.onPress(event);
        }
        if (event.defaultPrevented) {
          return;
        }
        if (process.env.EXPO_OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();

          try {
            // Open the link in an in-app browser.
            await openBrowserAsync(href, {
              presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
            });
          } catch (error) {
            console.error('ExternalLink: Failed to open browser:', error);
          }
        }
      }}
    />
  );
}
