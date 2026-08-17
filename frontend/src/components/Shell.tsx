'use client';

import {
  usePathname,
} from 'next/navigation';

import {
  AuthProvider,
} from '@/lib/auth-context';

import {
  NotificationsProvider,
} from '@/lib/notifications-context';

import {
  ListLabelsProvider,
} from '@/lib/list-labels-context';

import {
  BrandingProvider,
} from '@/lib/branding-context';



import Navbar from '@/components/Navbar';
import { LoadingProvider } from './loading-context';
import { DictionaryProvider } from '@/lib/dictionary-context';


export default function Shell({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const pathname =
    usePathname();


  const isPublicPage =
    pathname ===
      '/' ||
    pathname ===
      '/login' ||
    pathname ===
      '/register' ||
    pathname ===
      '/forgot-password' ||
    pathname ===
      '/reset-password';


  return (
    <LoadingProvider>
      <DictionaryProvider>
        <BrandingProvider>
        <AuthProvider>
          <ListLabelsProvider>
            <NotificationsProvider>
              {!isPublicPage && (
                <Navbar />
              )}


              <main
                className={
                  isPublicPage
                    ? ''
                    : `
                      mx-auto
                      w-full
                      max-w-[1600px]
                      px-3
                      pb-8
                      pt-[84px]
                      sm:px-5
                      lg:px-6
                      2xl:px-8
                    `
                }
              >
                {children}
              </main>
            </NotificationsProvider>
          </ListLabelsProvider>
        </AuthProvider>
        </BrandingProvider>
      </DictionaryProvider>
    </LoadingProvider>
  );
}
