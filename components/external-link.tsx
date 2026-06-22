import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

export function ExternalLink({ href, ...rest }: Props) {
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

          // Safety check: do nothing if href is empty or invalid
          if (!href || typeof href !== 'string' || href.trim() === '' || href.toLowerCase() === 'undefined') {
            console.warn('ExternalLink: Attempted to open an invalid URL:', href);
            return;
          }

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
